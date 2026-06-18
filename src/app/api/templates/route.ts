import { NextRequest } from "next/server";
import { DocumentTemplateType } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission } from "@/lib/security/auth-guard";
import { saveUpload } from "@/lib/uploads";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireAnyPermission(request, ["settings.view", "templates.manage"]);
    const type = request.nextUrl.searchParams.get("type") as DocumentTemplateType | null;
    const bidTypeId = request.nextUrl.searchParams.get("bidTypeId");
    const stageTemplateSlotId = request.nextUrl.searchParams.get("stageTemplateSlotId");
    const rows = await prisma.documentTemplate.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(bidTypeId === "null"
          ? { bidTypeId: null }
          : bidTypeId
            ? { bidTypeId }
            : {}),
        ...(stageTemplateSlotId ? { stageTemplateSlotId } : {}),
      },
      include: {
        bidType: true,
        stageTemplateSlot: true,
        placeholders: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ bidTypeId: "asc" }, { version: "desc" }],
    });
    return jsonOk(rows);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "templates.manage");
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const type = String(form.get("type") ?? "NOTICE") as DocumentTemplateType;
    const bidTypeIdRaw = form.get("bidTypeId");
    const bidTypeId =
      bidTypeIdRaw && String(bidTypeIdRaw) !== "null" ? String(bidTypeIdRaw) : null;
    const stageTemplateSlotIdRaw = form.get("stageTemplateSlotId");
    const stageTemplateSlotId =
      stageTemplateSlotIdRaw && String(stageTemplateSlotIdRaw) !== "null"
        ? String(stageTemplateSlotIdRaw)
        : null;
    const file = form.get("file");

    if (!name) {
      throw new ApiError(400, "VALIDATION_ERROR", "Template name is required");
    }
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Word document (.docx) file is required");
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      throw new ApiError(400, "VALIDATION_ERROR", "Only .docx Word templates are supported");
    }

    let templateType = type;
    if (stageTemplateSlotId) {
      const slot = await prisma.procurementStageTemplateSlot.findUnique({
        where: { id: stageTemplateSlotId },
      });
      if (!slot) throw new ApiError(400, "VALIDATION_ERROR", "Unknown template slot");
      if (slot.documentType) templateType = slot.documentType;
      else if (!type) {
        throw new ApiError(400, "VALIDATION_ERROR", "Document type is required for this template slot");
      }
    }

    const latest = await prisma.documentTemplate.findFirst({
      where: {
        type: templateType,
        bidTypeId,
        ...(stageTemplateSlotId ? { stageTemplateSlotId } : {}),
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = await saveUpload("templates", buffer, file.name);

    await prisma.documentTemplate.updateMany({
      where: {
        type: templateType,
        bidTypeId,
        isActive: true,
        ...(stageTemplateSlotId ? { stageTemplateSlotId } : {}),
      },
      data: { isActive: false },
    });

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        type: templateType,
        bidTypeId,
        stageTemplateSlotId,
        filePath,
        version,
        isActive: true,
      },
      include: { bidType: true, stageTemplateSlot: true },
    });

    if (bidTypeId && templateType === "NOTICE") {
      await prisma.bidType.update({ where: { id: bidTypeId }, data: { templatePath: filePath } });
    }

    return jsonOk(template, 201);
  });
}
