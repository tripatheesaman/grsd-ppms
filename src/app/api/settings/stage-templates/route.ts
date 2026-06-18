import { DocumentTemplateType } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { getWorkflowStageDefinition } from "@/lib/procurement/stage-field-catalog";
import { slugifySlotKey } from "@/lib/procurement/stage-template-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const createSchema = z.object({
  stageKey: z.string().min(1),
  label: z.string().min(1),
  slotKey: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  documentType: z
    .enum(["NOTICE", "LOI_PASS", "LOI_FAIL", "LOI_WINNER", "LOA", "CONTRACT"])
    .optional()
    .nullable(),
  bidTypeScoped: z.boolean().optional(),
});

function serializeSlot(row: {
  id: string;
  stageKey: string;
  slotKey: string;
  label: string;
  description: string | null;
  documentType: DocumentTemplateType | null;
  bidTypeScoped: boolean;
  sortOrder: number;
  isBuiltin: boolean;
  isActive: boolean;
}) {
  return row;
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const stageKey = request.nextUrl.searchParams.get("stageKey");
    const rows = await prisma.procurementStageTemplateSlot.findMany({
      where: {
        isActive: true,
        ...(stageKey ? { stageKey } : {}),
      },
      orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });
    return jsonOk(rows.map(serializeSlot));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = createSchema.parse(await request.json());
    const stage = getWorkflowStageDefinition(body.stageKey);
    if (!stage) throw new ApiError(400, "INVALID_STAGE", "Unknown workflow stage");

    let slotKey = body.slotKey?.trim() || slugifySlotKey(body.label);
    if (!slotKey) slotKey = `slot_${Date.now().toString(36)}`;

    const existing = await prisma.procurementStageTemplateSlot.findUnique({
      where: { stageKey_slotKey: { stageKey: body.stageKey, slotKey } },
    });
    if (existing) {
      slotKey = `${slotKey}_${Date.now().toString(36).slice(-4)}`;
    }

    const maxSort = await prisma.procurementStageTemplateSlot.aggregate({
      where: { stageKey: body.stageKey },
      _max: { sortOrder: true },
    });

    const row = await prisma.procurementStageTemplateSlot.create({
      data: {
        stageKey: body.stageKey,
        slotKey,
        label: body.label.trim(),
        description: body.description?.trim() || null,
        documentType: body.documentType ?? null,
        bidTypeScoped: body.bidTypeScoped ?? false,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        isBuiltin: false,
        isActive: true,
      },
    });

    return jsonOk(serializeSlot(row), 201);
  });
}
