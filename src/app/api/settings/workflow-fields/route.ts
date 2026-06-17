import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { getWorkflowStageDefinition, slugifyFieldKey } from "@/lib/procurement/stage-field-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const createSchema = z.object({
  stageKey: z.string().min(1),
  label: z.string().min(1),
  fieldKey: z.string().min(1).optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "TEXTAREA", "SELECT"]).default("TEXT"),
  optionsJson: z.array(z.string()).optional().nullable(),
  anchorFieldKey: z.string().min(1),
  position: z.enum(["BEFORE", "AFTER"]).default("AFTER"),
  sortOrder: z.number().int().optional(),
  required: z.boolean().optional(),
  hint: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

function serializeField(row: {
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
    optionsJson: Array.isArray(row.optionsJson)
      ? (row.optionsJson as string[])
      : row.optionsJson
        ? (row.optionsJson as string[])
        : null,
  };
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const stageKey = request.nextUrl.searchParams.get("stageKey");
    const rows = await prisma.procurementWorkflowField.findMany({
      where: stageKey ? { stageKey } : undefined,
      orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });
    return jsonOk(rows.map(serializeField));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = createSchema.parse(await request.json());
    const stage = getWorkflowStageDefinition(body.stageKey);
    if (!stage) throw new ApiError(400, "INVALID_STAGE", "Unknown workflow stage");

    const anchorExists = stage.fields.some((f) => f.fieldKey === body.anchorFieldKey);
    if (!anchorExists) {
      throw new ApiError(400, "INVALID_ANCHOR", "Anchor field not found in this stage");
    }

    let fieldKey = body.fieldKey?.trim() || slugifyFieldKey(body.label);
    if (!fieldKey) fieldKey = `field_${Date.now()}`;

    const existing = await prisma.procurementWorkflowField.findUnique({
      where: { stageKey_fieldKey: { stageKey: body.stageKey, fieldKey } },
    });
    if (existing) {
      fieldKey = `${fieldKey}_${Date.now().toString(36).slice(-4)}`;
    }

    const maxSort = await prisma.procurementWorkflowField.aggregate({
      where: { stageKey: body.stageKey, anchorFieldKey: body.anchorFieldKey, position: body.position },
      _max: { sortOrder: true },
    });

    const row = await prisma.procurementWorkflowField.create({
      data: {
        stageKey: body.stageKey,
        fieldKey,
        label: body.label,
        fieldType: body.fieldType,
        optionsJson: body.optionsJson ?? undefined,
        anchorFieldKey: body.anchorFieldKey,
        position: body.position,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        required: body.required ?? false,
        hint: body.hint ?? null,
        isActive: body.isActive ?? true,
      },
    });

    return jsonOk(serializeField(row), 201);
  });
}
