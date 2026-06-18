import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { loadProcurementSnapshot } from "@/lib/procurement/settings-snapshot";
import { loadWorkflowFieldOrderMap } from "@/lib/procurement/workflow-field-order";
import { requirePermission } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

function groupFieldOrderByStage(
  rows: Array<{ stageKey: string; fieldRef: string; sortOrder: number }>,
): Record<string, Array<{ fieldRef: string; sortOrder: number }>> {
  const map: Record<string, Array<{ fieldRef: string; sortOrder: number }>> = {};
  for (const row of rows) {
    const list = map[row.stageKey] ?? [];
    list.push({ fieldRef: row.fieldRef, sortOrder: row.sortOrder });
    map[row.stageKey] = list;
  }
  return map;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.view");
    const { id: procurementId } = await context.params;
    const stageKey = request.nextUrl.searchParams.get("stageKey");

    const [snapshot, values] = await Promise.all([
      loadProcurementSnapshot(procurementId),
      prisma.procurementWorkflowFieldValue.findMany({
        where: { procurementId },
      }),
    ]);

    const snapshotFields = (snapshot?.workflowFields ?? []).filter(
      (f) => f.isActive && (!stageKey || f.stageKey === stageKey),
    );
    const fields =
      snapshotFields.length > 0
        ? snapshotFields
        : await prisma.procurementWorkflowField.findMany({
            where: {
              isActive: true,
              ...(stageKey ? { stageKey } : {}),
            },
            orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }],
          });

    const snapshotOrder = snapshot?.workflowFieldOrder ?? [];
    const fieldOrderByStage =
      snapshotOrder.length > 0
        ? groupFieldOrderByStage(snapshotOrder)
        : await loadWorkflowFieldOrderMap();

    return jsonOk({
      fields: fields.map((f) => ({
        ...f,
        optionsJson: Array.isArray(f.optionsJson) ? f.optionsJson : null,
      })),
      values: Object.fromEntries(values.map((v) => [v.fieldId, v.value])),
      fieldOrderByStage,
    });
  });
}

const saveSchema = z.object({
  values: z.record(z.string(), z.string()),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.edit");
    const { id: procurementId } = await context.params;
    const body = saveSchema.parse(await request.json());

    const fieldIds = Object.keys(body.values);
    if (!fieldIds.length) return jsonOk({ success: true });

    const fields = await prisma.procurementWorkflowField.findMany({
      where: { id: { in: fieldIds } },
    });

    for (const field of fields) {
      const value = body.values[field.id] ?? "";
      if (field.required && !value.trim()) {
        continue;
      }
      await prisma.procurementWorkflowFieldValue.upsert({
        where: {
          procurementId_fieldId: { procurementId, fieldId: field.id },
        },
        create: { procurementId, fieldId: field.id, value },
        update: { value },
      });
    }

    return jsonOk({ success: true });
  });
}
