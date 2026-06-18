import type { Prisma } from "@prisma/client";
import { nepaliFyAdRange, MIN_NEPALI_FY_START } from "@/lib/calendar/nepali-fy";
import { dateOnlyToDb } from "@/lib/dates";
import {
  buildQueueWhere,
  type WorkflowQueueKey,
} from "@/lib/procurement/workflow-queues";

export type ProcurementExportMode = "filtered" | "page" | "all";

export type ProcurementListFilters = {
  search?: string;
  status?: string;
  queueKey: WorkflowQueueKey;
  bidTypeId?: string;
  mediaOfBidId?: string;
  contractTypeId?: string;
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
  nepaliFy?: string;
  sort: string;
  order: "asc" | "desc";
};

const SORT_FIELDS = new Set(["createdAt", "noticeDate", "title"]);

export function parseProcurementListFilters(
  searchParams: URLSearchParams,
): ProcurementListFilters {
  const queue = searchParams.get("queue");
  const stage = searchParams.get("stage");
  const sort = searchParams.get("sort") ?? "createdAt";
  return {
    search: searchParams.get("search")?.trim() || undefined,
    status: searchParams.get("status") || undefined,
    queueKey: (queue ?? stage ?? "all") as WorkflowQueueKey,
    bidTypeId: searchParams.get("bidTypeId") || undefined,
    mediaOfBidId: searchParams.get("mediaOfBidId") || undefined,
    contractTypeId: searchParams.get("contractTypeId") || undefined,
    unitId: searchParams.get("unitId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    nepaliFy: searchParams.get("nepaliFy") || undefined,
    sort: SORT_FIELDS.has(sort) ? sort : "createdAt",
    order: searchParams.get("order") === "asc" ? "asc" : "desc",
  };
}

export function parseExportMode(searchParams: URLSearchParams): ProcurementExportMode {
  const mode = searchParams.get("exportMode");
  if (mode === "all" || mode === "page" || mode === "filtered") return mode;
  return "filtered";
}

function applyNoticeDateRange(
  where: Prisma.ProcurementWhereInput,
  dateFrom?: string,
  dateTo?: string,
  nepaliFy?: string,
) {
  let from = dateFrom;
  let to = dateTo;

  if (nepaliFy) {
    const fyYear = Number(nepaliFy);
    if (Number.isFinite(fyYear) && fyYear >= MIN_NEPALI_FY_START) {
      const fyRange = nepaliFyAdRange(fyYear);
      from = !from || from < fyRange.start ? fyRange.start : from;
      to = !to || to > fyRange.end ? fyRange.end : to;
    }
  }

  if (!from && !to) return;

  where.noticeDate = {};
  if (from) where.noticeDate.gte = dateOnlyToDb(from);
  if (to) where.noticeDate.lte = dateOnlyToDb(to);
}

export function buildProcurementListWhere(
  filters: ProcurementListFilters,
  options?: { exportMode?: ProcurementExportMode },
): Prisma.ProcurementWhereInput {
  const exportMode = options?.exportMode ?? "filtered";
  const where: Prisma.ProcurementWhereInput = {};

  if (exportMode === "all") {
    if (!filters.status && filters.queueKey !== "all") {
      Object.assign(where, buildQueueWhere(filters.queueKey));
    }
    return where;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { itemName: { contains: filters.search } },
      { dtssrNumber: { contains: filters.search } },
    ];
  }

  if (filters.status) {
    where.status = filters.status as Prisma.EnumProcurementStatusFilter["equals"];
  } else if (filters.queueKey !== "all") {
    Object.assign(where, buildQueueWhere(filters.queueKey));
  }

  if (filters.bidTypeId) where.bidTypeId = filters.bidTypeId;
  if (filters.mediaOfBidId) where.mediaOfBidId = filters.mediaOfBidId;
  if (filters.contractTypeId) where.contractTypeId = filters.contractTypeId;
  if (filters.unitId) where.unitId = filters.unitId;

  applyNoticeDateRange(where, filters.dateFrom, filters.dateTo, filters.nepaliFy);

  return where;
}

export function buildProcurementOrderBy(
  filters: ProcurementListFilters,
): Prisma.ProcurementOrderByWithRelationInput {
  return { [filters.sort]: filters.order };
}

export function procurementListFiltersToSearchParams(
  filters: ProcurementListFilters & {
    page?: number;
    pageSize?: number;
    exportMode?: ProcurementExportMode;
  },
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.queueKey !== "all" && !filters.status) params.set("queue", filters.queueKey);
  if (filters.bidTypeId) params.set("bidTypeId", filters.bidTypeId);
  if (filters.mediaOfBidId) params.set("mediaOfBidId", filters.mediaOfBidId);
  if (filters.contractTypeId) params.set("contractTypeId", filters.contractTypeId);
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.nepaliFy) params.set("nepaliFy", filters.nepaliFy);
  if (filters.sort !== "createdAt") params.set("sort", filters.sort);
  if (filters.order !== "desc") params.set("order", filters.order);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.exportMode) params.set("exportMode", filters.exportMode);
  return params;
}
