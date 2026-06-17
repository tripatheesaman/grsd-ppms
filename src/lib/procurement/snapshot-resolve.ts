import type { DocumentTemplateType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  loadProcurementSnapshot,
  type ProcurementSelectionSnapshot,
  type ProcurementSettingsSnapshot,
} from "@/lib/procurement/settings-snapshot";

type BidTypeShape = {
  id: string;
  name: string;
  defaultBidDays: number;
  defaultPriceBidDays: number;
};

type NamedLookup = { id: string; name: string; symbol?: string | null };

export function resolveBidTypeFromSnapshot(
  snapshot: ProcurementSettingsSnapshot | null,
  live: BidTypeShape | null,
): BidTypeShape | null {
  if (live) return live;
  const sel = snapshot?.procurement;
  if (!sel?.bidTypeName) return null;
  return {
    id: sel.bidTypeId,
    name: sel.bidTypeName,
    defaultBidDays: sel.defaultBidDays ?? snapshot?.bidDays ?? 0,
    defaultPriceBidDays: sel.defaultPriceBidDays ?? 7,
  };
}

export function resolveNamedLookup(
  live: NamedLookup | null,
  snapshot: ProcurementSelectionSnapshot | undefined,
  idKey: keyof ProcurementSelectionSnapshot,
  nameKey: keyof ProcurementSelectionSnapshot,
  symbolKey?: keyof ProcurementSelectionSnapshot,
): NamedLookup | null {
  if (live) return live;
  const id = snapshot?.[idKey];
  const name = snapshot?.[nameKey];
  if (!id || !name || typeof name !== "string") return null;
  const symbol = symbolKey ? snapshot?.[symbolKey] : undefined;
  return {
    id: String(id),
    name,
    symbol: typeof symbol === "string" ? symbol : null,
  };
}

export type ResolvedTemplate = {
  id: string | null;
  name: string;
  filePath: string;
  version: number;
  type: DocumentTemplateType;
};

export async function resolveDocumentTemplateForProcurement(
  procurementId: string,
  type: DocumentTemplateType,
  bidTypeId: string | null,
): Promise<ResolvedTemplate | null> {
  const snapshot = await loadProcurementSnapshot(procurementId);
  if (snapshot?.templates?.length) {
    const specific = snapshot.templates.find((t) => t.type === type && t.bidTypeId === bidTypeId);
    const fallback = snapshot.templates.find((t) => t.type === type && !t.bidTypeId);
    const hit = specific ?? fallback;
    if (hit) {
      return {
        id: hit.id,
        name: hit.name,
        filePath: hit.filePath,
        version: hit.version,
        type: hit.type,
      };
    }
  }

  if (bidTypeId) {
    const specific = await prisma.documentTemplate.findFirst({
      where: { type, bidTypeId, isActive: true },
      orderBy: { version: "desc" },
    });
    if (specific) {
      return {
        id: specific.id,
        name: specific.name,
        filePath: specific.filePath,
        version: specific.version,
        type: specific.type,
      };
    }
  }

  const global = await prisma.documentTemplate.findFirst({
    where: { type, bidTypeId: null, isActive: true },
    orderBy: { version: "desc" },
  });
  if (!global) return null;
  return {
    id: global.id,
    name: global.name,
    filePath: global.filePath,
    version: global.version,
    type: global.type,
  };
}

export async function recordGeneratedDocument(input: {
  procurementId: string;
  template: ResolvedTemplate;
  filePath: string;
}) {
  return prisma.generatedDocument.create({
    data: {
      procurementId: input.procurementId,
      templateId: input.template.id,
      templateName: input.template.name,
      templateType: input.template.type,
      filePath: input.filePath,
    },
  });
}

export async function loadReferenceTypeLabels(
  referenceTypeIds: string[],
): Promise<Map<string, { name: string; code: string }>> {
  if (referenceTypeIds.length === 0) return new Map();
  const rows = await prisma.referenceType.findMany({
    where: { id: { in: referenceTypeIds } },
    select: { id: true, name: true, code: true },
  });
  return new Map(rows.map((r) => [r.id, { name: r.name, code: r.code }]));
}

export async function loadWorkDayCategoryLabels(
  categoryIds: string[],
): Promise<Map<string, string>> {
  if (categoryIds.length === 0) return new Map();
  const rows = await prisma.workDayCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}
