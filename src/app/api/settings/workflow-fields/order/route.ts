import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  buildWorkflowFieldLayout,
  customFieldRef,
  getWorkflowStageDefinition,
  layoutItemFieldRef,
  builtinFieldRef,
} from "@/lib/procurement/stage-field-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const saveSchema = z.object({
  stageKey: z.string().min(1),
  items: z.array(
    z.object({
      fieldRef: z.string().min(1),
      sortOrder: z.number().int(),
    }),
  ),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const stageKey = request.nextUrl.searchParams.get("stageKey");
    const rows = await prisma.procurementWorkflowFieldOrder.findMany({
      where: stageKey ? { stageKey } : undefined,
      orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }],
    });
    return jsonOk(rows.map((r) => ({ fieldRef: r.fieldRef, sortOrder: r.sortOrder, stageKey: r.stageKey })));
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = saveSchema.parse(await request.json());
    const stage = getWorkflowStageDefinition(body.stageKey);
    if (!stage) throw new ApiError(400, "INVALID_STAGE", "Unknown workflow stage");

    const customFields = await prisma.procurementWorkflowField.findMany({
      where: { stageKey: body.stageKey, isActive: true },
    });
    const validBuiltin = new Set(stage.fields.map((f) => builtinFieldRef(f.fieldKey)));
    const validCustom = new Set(customFields.map((f) => customFieldRef(f.id)));

    const defaultLayout = buildWorkflowFieldLayout(body.stageKey, customFields.map(serializeCustomField));
    const defaultRefs = new Set(defaultLayout.map(layoutItemFieldRef));

    for (const item of body.items) {
      const isBuiltin = item.fieldRef.startsWith("builtin:");
      const isCustom = item.fieldRef.startsWith("custom:");
      if (!isBuiltin && !isCustom) {
        throw new ApiError(400, "INVALID_FIELD_REF", `Invalid field reference: ${item.fieldRef}`);
      }
      if (isBuiltin && !validBuiltin.has(item.fieldRef)) {
        throw new ApiError(400, "INVALID_FIELD_REF", `Unknown built-in field: ${item.fieldRef}`);
      }
      if (isCustom && !validCustom.has(item.fieldRef)) {
        throw new ApiError(400, "INVALID_FIELD_REF", `Unknown custom field: ${item.fieldRef}`);
      }
      if (!defaultRefs.has(item.fieldRef)) {
        throw new ApiError(400, "INVALID_FIELD_REF", `Field not in stage layout: ${item.fieldRef}`);
      }
    }

    await prisma.$transaction([
      prisma.procurementWorkflowFieldOrder.deleteMany({ where: { stageKey: body.stageKey } }),
      ...body.items.map((item) =>
        prisma.procurementWorkflowFieldOrder.create({
          data: {
            stageKey: body.stageKey,
            fieldRef: item.fieldRef,
            sortOrder: item.sortOrder,
          },
        }),
      ),
    ]);

    return jsonOk({ success: true });
  });
}

function serializeCustomField(row: {
  id: string;
  stageKey: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  optionsJson: unknown;
  anchorFieldKey: string;
  position: string;
  sortOrder: number;
  required: boolean;
  hint: string | null;
  isActive: boolean;
}) {
  return {
    ...row,
    position: row.position as "BEFORE" | "AFTER",
    optionsJson: Array.isArray(row.optionsJson) ? (row.optionsJson as string[]) : null,
  };
}
