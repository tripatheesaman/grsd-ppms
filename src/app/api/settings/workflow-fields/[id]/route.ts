import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { getWorkflowStageDefinition } from "@/lib/procurement/stage-field-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "TEXTAREA", "SELECT"]).optional(),
  optionsJson: z.array(z.string()).optional().nullable(),
  anchorFieldKey: z.string().min(1).optional(),
  position: z.enum(["BEFORE", "AFTER"]).optional(),
  sortOrder: z.number().int().optional(),
  required: z.boolean().optional(),
  hint: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());

    const existing = await prisma.procurementWorkflowField.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Field not found");

    if (body.anchorFieldKey) {
      const stage = getWorkflowStageDefinition(existing.stageKey);
      if (!stage?.fields.some((f) => f.fieldKey === body.anchorFieldKey)) {
        throw new ApiError(400, "INVALID_ANCHOR", "Anchor field not found in this stage");
      }
    }

    const row = await prisma.procurementWorkflowField.update({
      where: { id },
      data: {
        label: body.label,
        fieldType: body.fieldType,
        anchorFieldKey: body.anchorFieldKey,
        position: body.position,
        sortOrder: body.sortOrder,
        required: body.required,
        hint: body.hint,
        isActive: body.isActive,
        ...(body.optionsJson !== undefined
          ? {
              optionsJson:
                body.optionsJson === null ? Prisma.JsonNull : body.optionsJson,
            }
          : {}),
      },
    });

    return jsonOk(row);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;
    const existing = await prisma.procurementWorkflowField.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Field not found");

    await prisma.$transaction([
      prisma.procurementWorkflowFieldOrder.deleteMany({
        where: { stageKey: existing.stageKey, fieldRef: `custom:${id}` },
      }),
      prisma.procurementWorkflowField.delete({ where: { id } }),
    ]);
    return jsonOk({ success: true });
  });
}
