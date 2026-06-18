import { prisma } from "@/lib/prisma";
import {
  buildWorkflowFieldLayout,
  layoutItemFieldRef,
  type CustomWorkflowField,
  type WorkflowFieldOrderEntry,
} from "@/lib/procurement/stage-field-catalog";

export async function loadWorkflowFieldOrderForStage(
  stageKey: string,
): Promise<WorkflowFieldOrderEntry[]> {
  const rows = await prisma.procurementWorkflowFieldOrder.findMany({
    where: { stageKey },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({ fieldRef: r.fieldRef, sortOrder: r.sortOrder }));
}

export async function loadWorkflowFieldOrderMap(): Promise<
  Record<string, WorkflowFieldOrderEntry[]>
> {
  const rows = await prisma.procurementWorkflowFieldOrder.findMany({
    orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }],
  });
  const map: Record<string, WorkflowFieldOrderEntry[]> = {};
  for (const row of rows) {
    const list = map[row.stageKey] ?? [];
    list.push({ fieldRef: row.fieldRef, sortOrder: row.sortOrder });
    map[row.stageKey] = list;
  }
  return map;
}

export function buildFieldOrderPayload(
  stageKey: string,
  customFields: CustomWorkflowField[],
  visibleBuiltinKeys?: string[],
): WorkflowFieldOrderEntry[] {
  return buildWorkflowFieldLayout(stageKey, customFields, { visibleBuiltinKeys }).map(
    (item, index) => ({
      fieldRef: layoutItemFieldRef(item),
      sortOrder: index,
    }),
  );
}
