import { NextRequest } from "next/server";
import { ProcurementStatus } from "@prisma/client";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { dateFromDb } from "@/lib/dates";
import {
  buildProcurementListWhere,
  buildProcurementOrderBy,
  parseProcurementListFilters,
} from "@/lib/procurement/list-filters";
import { calculateWorkCountdown } from "@/lib/procurement/work-countdown";
import { createOrUpdateProcurement } from "@/lib/procurement/service";
import { resolveProcurementCalculationContext } from "@/lib/procurement/settings-snapshot";
import {
  computeDaysInStage,
  countActiveBidders,
  getWorkflowQueue,
} from "@/lib/procurement/workflow-queues";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const optionalId = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const createSchema = z.object({
  title: z.string().min(1),
  itemName: z.string().min(1),
  dtssrNumber: z.union([z.string(), z.null()]).optional().transform((v) => v?.trim() || null),
  mediaOfBidId: optionalId,
  bidTypeId: z.string().min(1),
  sbdId: optionalId,
  contractTypeId: optionalId,
  unitId: optionalId,
  costEstimate: z.coerce.number().positive(),
  bsfPercent: z.coerce.number().min(0).max(100),
  totalQuantity: z.coerce.number().optional().nullable(),
  noticeDate: z.string(),
  scheduledInitiationDate: z.string().optional().nullable(),
  prebidTime: z.string().optional(),
  bidSubmissionTime: z.string().optional(),
  bidOpenTime: z.string().optional(),
  references: z
    .array(z.object({ referenceTypeId: z.string(), number: z.string() }))
    .min(1),
  workDays: z
    .array(z.object({ workDayCategoryId: z.string(), days: z.number().int().min(0) }))
    .optional()
    .default([]),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.view");
    const searchParams = request.nextUrl.searchParams;
    const params = parsePagination(searchParams);
    const filters = parseProcurementListFilters(searchParams);
    const where = buildProcurementListWhere(filters);
    const orderBy = buildProcurementOrderBy(filters);

    let activeQueue = getWorkflowQueue("all");
    if (!filters.status && filters.queueKey !== "all") {
      activeQueue = getWorkflowQueue(filters.queueKey);
    }

    const statusesParam = searchParams.get("statuses");
    if (!filters.status && filters.queueKey === "all" && statusesParam) {
      const list = statusesParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) {
        where.status = { in: list as ProcurementStatus[] };
      }
    }

    const [total, rows] = await Promise.all([
      prisma.procurement.count({ where }),
      prisma.procurement.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          bidType: true,
          mediaOfBid: true,
          bidders: { select: { passedTech: true } },
        },
      }),
    ]);

    const needsEvents = activeQueue.stageStatusForEvent && rows.length > 0;
    const stageEvents = needsEvents
      ? await prisma.procurementEvent.findMany({
          where: {
            procurementId: { in: rows.map((r) => r.id) },
            toStatus: activeQueue.stageStatusForEvent!,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const eventByProcId = new Map<string, Date>();
    for (const ev of stageEvents) {
      if (!eventByProcId.has(ev.procurementId)) {
        eventByProcId.set(ev.procurementId, ev.createdAt);
      }
    }

    const data = await Promise.all(
      rows.map(async (r) => {
        let remainingDays: number | null = null;
        let dueDate: string | null = null;
        if (activeQueue.showCountdown && r.poIssueDate && r.workCountdownTotalDays != null) {
          const { calendar } = await resolveProcurementCalculationContext(r.id, 0);
          const countdown = calculateWorkCountdown(
            {
              poIssueDate: dateFromDb(r.poIssueDate),
              pdiStartDate: dateFromDb(r.pdiDate),
              pdiEndDate: dateFromDb(r.pdiEndDate),
              totalWorkDays: r.workCountdownTotalDays,
              status: r.status,
              frozenElapsedDays: r.contractElapsedDays,
            },
            calendar,
          );
          remainingDays = countdown?.remainingDays ?? null;
          dueDate = countdown?.dueDate ?? null;
        }

        const activeBidderCount = activeQueue.showBidderCount
          ? countActiveBidders(r.bidders, activeQueue.bidderCountMode ?? "all")
          : null;

        const daysInStage = computeDaysInStage(
          r,
          activeQueue,
          eventByProcId.get(r.id) ?? null,
        );

        return {
          id: r.id,
          title: r.title,
          itemName: r.itemName,
          status: r.status,
          costEstimate: Number(r.costEstimate),
          noticeDate: dateFromDb(r.noticeDate),
          bidOpenDate: dateFromDb(r.bidOpenDate),
          bidTypeName: r.bidType?.name ?? null,
          bidTypeId: r.bidTypeId,
          mediaOfBidName: r.mediaOfBid?.name ?? null,
          workCountdownRemainingDays: remainingDays,
          workCountdownDueDate: dueDate,
          activeBidderCount,
          daysInStage,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    );

    return jsonOk({
      data,
      meta: paginationMeta(total, params),
    });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.create");
    const body = createSchema.parse(await request.json());
    const result = await createOrUpdateProcurement(body, user.id);
    return jsonOk(result, 201);
  });
}
