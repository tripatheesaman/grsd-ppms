import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  documentType: z
    .enum(["NOTICE", "LOI_PASS", "LOI_FAIL", "LOI_WINNER", "LOA", "CONTRACT"])
    .optional()
    .nullable(),
  bidTypeScoped: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.procurementStageTemplateSlot.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Template slot not found");

    const row = await prisma.procurementStageTemplateSlot.update({
      where: { id },
      data: {
        label: body.label,
        description: body.description,
        documentType: body.documentType === undefined ? undefined : body.documentType,
        bidTypeScoped: body.bidTypeScoped,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
      },
    });

    return jsonOk(row);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;

    const existing = await prisma.procurementStageTemplateSlot.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Template slot not found");
    if (existing.isBuiltin) {
      throw new ApiError(400, "BUILTIN_SLOT", "Built-in template slots cannot be deleted");
    }

    await prisma.$transaction([
      prisma.documentTemplate.updateMany({
        where: { stageTemplateSlotId: id },
        data: { stageTemplateSlotId: null },
      }),
      prisma.procurementStageTemplateSlot.delete({ where: { id } }),
    ]);

    return jsonOk({ success: true });
  });
}
