import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PROCUREMENT_EXPORT_INCLUDE = {
  bidType: true,
  mediaOfBid: true,
  contractType: true,
  unit: true,
  sbd: true,
  references: { include: { referenceType: true }, orderBy: { createdAt: "asc" as const } },
  workDayCategories: { include: { workDayCategory: true }, orderBy: { createdAt: "asc" as const } },
  bidders: {
    include: {
      bidAmountLines: { orderBy: { sortOrder: "asc" as const } },
      fieldValues: { orderBy: { fieldKey: "asc" as const } },
    },
    orderBy: { name: "asc" as const },
  },
  pdiMembers: { orderBy: { createdAt: "asc" as const } },
  workflowFieldValues: { include: { field: true }, orderBy: { createdAt: "asc" as const } },
  generatedDocuments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ProcurementInclude;

export type ProcurementExportRecord = Prisma.ProcurementGetPayload<{
  include: typeof PROCUREMENT_EXPORT_INCLUDE;
}>;

export async function loadProcurementsForExport(
  where: Prisma.ProcurementWhereInput,
  orderBy: Prisma.ProcurementOrderByWithRelationInput,
  options: { skip?: number; take: number },
): Promise<ProcurementExportRecord[]> {
  return prisma.procurement.findMany({
    where,
    include: PROCUREMENT_EXPORT_INCLUDE,
    orderBy,
    skip: options.skip,
    take: options.take,
  });
}
