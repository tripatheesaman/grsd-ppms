import type { FieldErrors } from "react-hook-form";

import type { ProcurementFormValues } from "@/components/procurement/procurement-form";

export function firstFieldError(errors: FieldErrors): string | undefined {
  for (const key of Object.keys(errors)) {
    const err = errors[key];
    if (!err || typeof err !== "object") continue;
    if ("message" in err && err.message) return String(err.message);
    const nested = firstFieldError(err as FieldErrors);
    if (nested) return nested;
  }
  return undefined;
}

type WorkDayRow = { workDayCategoryId: string; days: number };
type WorkDayRowInput = { workDayCategoryId?: string; days: number };
type ReferenceRow = { referenceTypeId: string; number: string };
type ReferenceRowInput = { referenceTypeId?: string; number: string };
type LookupCategory = { id: string; name: string; sortOrder?: number };

export function sortLookupRows<T extends { sortOrder?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function buildReferenceFormRows(
  refTypes: LookupCategory[],
  saved: ReferenceRowInput[] = [],
): ReferenceRow[] {
  const byTypeId = new Map(
    saved.filter((r) => r.referenceTypeId).map((r) => [r.referenceTypeId, r.number]),
  );
  return sortLookupRows(refTypes).map((rt, index) => ({
    referenceTypeId: rt.id,
    number: byTypeId.get(rt.id) ?? saved[index]?.number ?? "",
  }));
}

export function buildWorkDayFormRows(
  categories: LookupCategory[],
  saved: WorkDayRowInput[] = [],
): WorkDayRow[] {
  const byCategoryId = new Map(
    saved.filter((w) => w.workDayCategoryId).map((w) => [w.workDayCategoryId, w.days]),
  );
  return sortLookupRows(categories).map((cat, index) => ({
    workDayCategoryId: cat.id,
    days: byCategoryId.get(cat.id) ?? saved[index]?.days ?? 0,
  }));
}

export function normalizeReferencesForSave(
  references: ReferenceRow[],
): Array<{ referenceTypeId: string; number: string }> {
  return references
    .map((r) => ({ referenceTypeId: r.referenceTypeId, number: r.number.trim() }))
    .filter((r) => r.referenceTypeId && r.number.length > 0);
}
type LookupOption = { id: string; name: string };

function resolveFkId(
  proc: Record<string, unknown>,
  fkField: string,
  relationField: string,
): string {
  const fk = proc[fkField];
  if (fk != null && fk !== "") return String(fk);
  const rel = proc[relationField] as { id?: string } | null | undefined;
  return rel?.id ? String(rel.id) : "";
}

export type ProcurementSavedLookups = {
  mediaOfBid?: { id: string; name: string } | null;
  sbd?: { id: string; name: string } | null;
  contractType?: { id: string; name: string } | null;
  unit?: { id: string; name: string } | null;
};

export function mergeLookupOptions(
  options: LookupOption[] | undefined,
  selectedId: string | undefined,
  saved?: LookupOption | null,
): LookupOption[] {
  const list = options ?? [];
  if (!selectedId) return list;
  if (list.some((o) => o.id === selectedId)) return list;
  if (saved?.id === selectedId) return [...list, saved];
  return [...list, { id: selectedId, name: "Selected value" }];
}

export function toProcurementBody(values: ProcurementFormValues): Record<string, unknown> {
  return {
    title: values.title,
    itemName: values.itemName,
    dtssrNumber: values.dtssrNumber?.trim() || null,
    mediaOfBidId: values.mediaOfBidId || null,
    bidTypeId: values.bidTypeId,
    sbdId: values.sbdId || null,
    contractTypeId: values.contractTypeId || null,
    unitId: values.unitId || null,
    costEstimate: values.costEstimate,
    bsfPercent: values.bsfPercent,
    totalQuantity: values.totalQuantity ?? null,
    noticeDate: values.noticeDate,
    scheduledInitiationDate: values.scheduledInitiationDate?.trim() || null,
    prebidTime: values.prebidTime,
    bidSubmissionTime: values.bidSubmissionTime,
    bidOpenTime: values.bidOpenTime,
    references: normalizeReferencesForSave(values.references),
  };
}

export function mapProcurementToFormValues(
  proc: Record<string, unknown>,
  refTypes: LookupCategory[],
): ProcurementFormValues {
  return {
    title: String(proc.title),
    itemName: String(proc.itemName),
    dtssrNumber: proc.dtssrNumber ? String(proc.dtssrNumber) : "",
    mediaOfBidId: resolveFkId(proc, "mediaOfBidId", "mediaOfBid"),
    bidTypeId: resolveFkId(proc, "bidTypeId", "bidType"),
    sbdId: resolveFkId(proc, "sbdId", "sbd"),
    contractTypeId: resolveFkId(proc, "contractTypeId", "contractType"),
    unitId: resolveFkId(proc, "unitId", "unit"),
    costEstimate: Number(proc.costEstimate),
    bsfPercent: Number(proc.bsfPercent),
    totalQuantity: proc.totalQuantity != null ? Number(proc.totalQuantity) : undefined,
    noticeDate: proc.noticeDate ? String(proc.noticeDate) : "",
    scheduledInitiationDate: proc.scheduledInitiationDate
      ? String(proc.scheduledInitiationDate)
      : "",
    prebidTime: String(proc.prebidTime ?? "12:00"),
    bidSubmissionTime: String(proc.bidSubmissionTime ?? "16:00"),
    bidOpenTime: String(proc.bidOpenTime ?? "14:00"),
    references: buildReferenceFormRows(
      refTypes,
      ((proc.references as ReferenceRow[] | undefined) ?? []).map((r) => ({
        referenceTypeId: r.referenceTypeId,
        number: r.number,
      })),
    ),
  };
}
