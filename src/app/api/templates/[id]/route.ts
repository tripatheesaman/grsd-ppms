import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "templates.manage");
    const { id } = await context.params;
    const template = await prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new ApiError(404, "NOT_FOUND", "Template not found");

    await prisma.documentTemplate.delete({ where: { id } });

    if (template.bidTypeId && template.type === "NOTICE") {
      const next = await prisma.documentTemplate.findFirst({
        where: { type: "NOTICE", bidTypeId: template.bidTypeId, isActive: true },
        orderBy: { version: "desc" },
      });
      if (!next) {
        const latest = await prisma.documentTemplate.findFirst({
          where: { type: "NOTICE", bidTypeId: template.bidTypeId },
          orderBy: { version: "desc" },
        });
        if (latest) {
          await prisma.documentTemplate.update({
            where: { id: latest.id },
            data: { isActive: true },
          });
          await prisma.bidType.update({
            where: { id: template.bidTypeId },
            data: { templatePath: latest.filePath },
          });
        } else {
          await prisma.bidType.update({
            where: { id: template.bidTypeId },
            data: { templatePath: null },
          });
        }
      }
    }

    return jsonOk({ success: true });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "templates.manage");
    const { id } = await context.params;
    const body = (await request.json()) as { isActive?: boolean };

    const template = await prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new ApiError(404, "NOT_FOUND", "Template not found");

    if (body.isActive === true && template.bidTypeId) {
      await prisma.documentTemplate.updateMany({
        where: {
          type: template.type,
          bidTypeId: template.bidTypeId,
          id: { not: id },
        },
        data: { isActive: false },
      });
      if (template.type === "NOTICE") {
        await prisma.bidType.update({
          where: { id: template.bidTypeId },
          data: { templatePath: template.filePath },
        });
      }
    }

    const updated = await prisma.documentTemplate.update({
      where: { id },
      data: { isActive: body.isActive ?? template.isActive },
      include: { bidType: true },
    });

    return jsonOk(updated);
  });
}
