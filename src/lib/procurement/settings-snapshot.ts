import type { DocumentTemplateType } from "@prisma/client";

import type { CalendarContext } from "@/lib/calendar/working-days";
import { loadCalendarContext } from "@/lib/calendar/load-context";
import { prisma } from "@/lib/prisma";
import type { AppSettings } from "@/lib/settings";
import { loadSettings, normalizeAppSettings } from "@/lib/settings";

export type LookupRowSnapshot = {
  id: string;
  name: string;
  code?: string | null;
  symbol?: string | null;
  defaultBidDays?: number;
  defaultPriceBidDays?: number;
};

export type TemplateRowSnapshot = {
  id: string;
  type: DocumentTemplateType;
  name: string;
  filePath: string;
  version: number;
  bidTypeId: string | null;
};

export type ProcurementSelectionSnapshot = {
  bidTypeId: string;
  bidTypeName: string;
  defaultBidDays: number;
  defaultPriceBidDays: number;
  mediaOfBidId?: string | null;
  mediaOfBidName?: string | null;
  sbdId?: string | null;
  sbdName?: string | null;
  contractTypeId?: string | null;
  contractTypeName?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  unitSymbol?: string | null;
};

export type ProcurementLookupsSnapshot = {
  referenceTypes: LookupRowSnapshot[];
  mediaOfBid: LookupRowSnapshot[];
  bidTypes: LookupRowSnapshot[];
  sbd: LookupRowSnapshot[];
  contractTypes: LookupRowSnapshot[];
  units: LookupRowSnapshot[];
  currencies: LookupRowSnapshot[];
  paymentConditions: LookupRowSnapshot[];
  workDayCategories: LookupRowSnapshot[];
};

export type ProcurementSettingsSnapshot = {
  version: 1 | 2;
  capturedAt: string;
  settings: AppSettings;
  calendar: CalendarContext;
  bidDays: number;
  lookups?: ProcurementLookupsSnapshot;
  templates?: TemplateRowSnapshot[];
  procurement?: ProcurementSelectionSnapshot;
  workflowFields?: Array<{
    id: string;
    stageKey: string;
    fieldKey: string;
    label: string;
    fieldType: string;
    optionsJson: string[] | null;
    anchorFieldKey: string;
    position: "BEFORE" | "AFTER";
    sortOrder: number;
    required: boolean;
    hint: string | null;
    isActive: boolean;
  }>;
};

export type ProcurementSnapshotSelection = {
  mediaOfBidId?: string | null;
  sbdId?: string | null;
  contractTypeId?: string | null;
  unitId?: string | null;
};

const EMPTY_LOOKUPS: ProcurementLookupsSnapshot = {
  referenceTypes: [],
  mediaOfBid: [],
  bidTypes: [],
  sbd: [],
  contractTypes: [],
  units: [],
  currencies: [],
  paymentConditions: [],
  workDayCategories: [],
};

async function loadActiveLookups(): Promise<ProcurementLookupsSnapshot> {
  const [referenceTypes, mediaOfBid, bidTypes, sbd, contractTypes, units, currencies, paymentConditions, workDayCategories] =
    await Promise.all([
      prisma.referenceType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.mediaOfBid.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.bidType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.sbd.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.contractType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.unit.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.currency.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.paymentCondition.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.workDayCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);

  return {
    referenceTypes: referenceTypes.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
    })),
    mediaOfBid: mediaOfBid.map((r) => ({ id: r.id, name: r.name })),
    bidTypes: bidTypes.map((r) => ({
      id: r.id,
      name: r.name,
      defaultBidDays: r.defaultBidDays,
      defaultPriceBidDays: r.defaultPriceBidDays,
    })),
    sbd: sbd.map((r) => ({ id: r.id, name: r.name })),
    contractTypes: contractTypes.map((r) => ({ id: r.id, name: r.name })),
    units: units.map((r) => ({ id: r.id, name: r.name, symbol: r.symbol })),
    currencies: currencies.map((r) => ({ id: r.id, name: r.name, code: r.code, symbol: r.symbol })),
    paymentConditions: paymentConditions.map((r) => ({ id: r.id, name: r.name, code: r.code })),
    workDayCategories: workDayCategories.map((r) => ({ id: r.id, name: r.name })),
  };
}

async function loadActiveTemplateSnapshots(): Promise<TemplateRowSnapshot[]> {
  const rows = await prisma.documentTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { version: "desc" }],
  });
  return rows.map((t) => ({
    id: t.id,
    type: t.type,
    name: t.name,
    filePath: t.filePath,
    version: t.version,
    bidTypeId: t.bidTypeId,
  }));
}

async function loadActiveWorkflowFieldSnapshots(): Promise<
  NonNullable<ProcurementSettingsSnapshot["workflowFields"]>
> {
  const rows = await prisma.procurementWorkflowField.findMany({
    where: { isActive: true },
    orderBy: [{ stageKey: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    stageKey: row.stageKey,
    fieldKey: row.fieldKey,
    label: row.label,
    fieldType: row.fieldType,
    optionsJson: Array.isArray(row.optionsJson) ? (row.optionsJson as string[]) : null,
    anchorFieldKey: row.anchorFieldKey,
    position: row.position === "BEFORE" ? "BEFORE" : "AFTER",
    sortOrder: row.sortOrder,
    required: row.required,
    hint: row.hint,
    isActive: row.isActive,
  }));
}

async function resolveSelectionSnapshot(
  bidType: {
    id: string;
    name: string;
    defaultBidDays: number;
    defaultPriceBidDays: number;
  },
  selection?: ProcurementSnapshotSelection,
): Promise<ProcurementSelectionSnapshot> {
  const [media, sbd, contractType, unit] = await Promise.all([
    selection?.mediaOfBidId
      ? prisma.mediaOfBid.findUnique({ where: { id: selection.mediaOfBidId } })
      : null,
    selection?.sbdId ? prisma.sbd.findUnique({ where: { id: selection.sbdId } }) : null,
    selection?.contractTypeId
      ? prisma.contractType.findUnique({ where: { id: selection.contractTypeId } })
      : null,
    selection?.unitId ? prisma.unit.findUnique({ where: { id: selection.unitId } }) : null,
  ]);

  return {
    bidTypeId: bidType.id,
    bidTypeName: bidType.name,
    defaultBidDays: bidType.defaultBidDays,
    defaultPriceBidDays: bidType.defaultPriceBidDays,
    mediaOfBidId: selection?.mediaOfBidId ?? null,
    mediaOfBidName: media?.name ?? null,
    sbdId: selection?.sbdId ?? null,
    sbdName: sbd?.name ?? null,
    contractTypeId: selection?.contractTypeId ?? null,
    contractTypeName: contractType?.name ?? null,
    unitId: selection?.unitId ?? null,
    unitName: unit?.name ?? null,
    unitSymbol: unit?.symbol ?? null,
  };
}

/** Full snapshot for a procurement: settings, calendar, lookups, templates, and selected labels. */
export async function captureProcurementSnapshot(
  bidType: {
    id: string;
    name: string;
    defaultBidDays: number;
    defaultPriceBidDays: number;
  },
  selection?: ProcurementSnapshotSelection,
): Promise<ProcurementSettingsSnapshot> {
  const [settings, calendar, lookups, templates, procurement, workflowFields] = await Promise.all([
    loadSettings(),
    loadCalendarContext(),
    loadActiveLookups(),
    loadActiveTemplateSnapshots(),
    resolveSelectionSnapshot(bidType, selection),
    loadActiveWorkflowFieldSnapshots(),
  ]);

  return {
    version: 2,
    capturedAt: new Date().toISOString(),
    settings,
    calendar,
    bidDays: bidType.defaultBidDays,
    lookups,
    templates,
    procurement,
    workflowFields,
  };
}

/** @deprecated Use captureProcurementSnapshot — kept for callers that only pass bid days. */
export async function captureSettingsSnapshot(
  bidDays: number,
): Promise<ProcurementSettingsSnapshot> {
  const bidType = await prisma.bidType.findFirst({
    where: { defaultBidDays: bidDays, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (bidType) {
    return captureProcurementSnapshot(bidType);
  }
  const settings = await loadSettings();
  const calendar = await loadCalendarContext();
  return {
    version: 2,
    capturedAt: new Date().toISOString(),
    settings,
    calendar,
    bidDays,
    lookups: await loadActiveLookups(),
    templates: await loadActiveTemplateSnapshots(),
  };
}

export function parseProcurementSettingsSnapshot(
  raw: unknown,
): ProcurementSettingsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<ProcurementSettingsSnapshot>;
  if (!value.settings || !value.calendar || typeof value.bidDays !== "number") {
    return null;
  }
  return {
    version: value.version === 2 ? 2 : 1,
    capturedAt: value.capturedAt ?? "",
    settings: normalizeAppSettings(value.settings),
    calendar: value.calendar,
    bidDays: value.bidDays,
    lookups: value.lookups ?? EMPTY_LOOKUPS,
    templates: value.templates ?? [],
    procurement: value.procurement,
    workflowFields: value.workflowFields ?? [],
  };
}

export async function resolveProcurementCalculationContext(
  procurementId: string | undefined,
  bidDays: number,
): Promise<{
  settings: AppSettings;
  calendar: CalendarContext;
  bidDays: number;
  snapshot: ProcurementSettingsSnapshot | null;
}> {
  if (procurementId) {
    const row = await prisma.procurement.findUnique({
      where: { id: procurementId },
      select: { settingsSnapshot: true },
    });
    const snapshot = parseProcurementSettingsSnapshot(row?.settingsSnapshot);
    if (snapshot) {
      return {
        settings: snapshot.settings,
        calendar: snapshot.calendar,
        bidDays: snapshot.bidDays,
        snapshot,
      };
    }
  }
  const settings = await loadSettings();
  const calendar = await loadCalendarContext();
  return { settings, calendar, bidDays, snapshot: null };
}

/** Letter CC and all formula settings come from the procurement snapshot only. */
export async function loadLetterDefaultCcLines(procurementId: string): Promise<string[]> {
  const settings = await loadProcurementSettings(procurementId);
  return settings.letterDefaultCcLines;
}

export async function loadProcurementSettings(procurementId: string): Promise<AppSettings> {
  const row = await prisma.procurement.findUnique({
    where: { id: procurementId },
    select: { settingsSnapshot: true },
  });
  const snapshot = parseProcurementSettingsSnapshot(row?.settingsSnapshot);
  if (snapshot) return normalizeAppSettings(snapshot.settings);
  return loadSettings();
}

export async function loadProcurementSnapshot(
  procurementId: string,
): Promise<ProcurementSettingsSnapshot | null> {
  const row = await prisma.procurement.findUnique({
    where: { id: procurementId },
    select: { settingsSnapshot: true },
  });
  return parseProcurementSettingsSnapshot(row?.settingsSnapshot);
}
