import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { dateFromDb, dateOnlyToDb } from "@/lib/dates";
import { calculateWorkCountdown } from "@/lib/procurement/work-countdown";
import { createOrUpdateProcurement } from "@/lib/procurement/service";
import { resolveProcurementCalculationContext } from "@/lib/procurement/settings-snapshot";
import {
  buildQueueWhere,
  computeDaysInStage,
  countActiveBidders,
  getWorkflowQueue,
  type WorkflowQueueKey,
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

function applyQueueFilter(where: Prisma.ProcurementWhereInput, queueKey: WorkflowQueueKey) {
  const queueWhere = buildQueueWhere(queueKey);
  Object.assign(where, queueWhere);
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.view");
    const params = parsePagination(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const status = request.nextUrl.searchParams.get("status");
    const bidTypeId = request.nextUrl.searchParams.get("bidTypeId");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");
    const sort = request.nextUrl.searchParams.get("sort") ?? "createdAt";
    const order = request.nextUrl.searchParams.get("order") === "asc" ? "asc" : "desc";
    const stage = request.nextUrl.searchParams.get("stage");
    const queue = request.nextUrl.searchParams.get("queue");

    const where: Prisma.ProcurementWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { itemName: { contains: search } },
        { dtssrNumber: { contains: search } },
      ];
    }
    if (status) where.status = status as Prisma.EnumProcurementStatusFilter["equals"];

    const queueKey = (queue ?? stage ?? "all") as WorkflowQueueKey;
    let activeQueue = getWorkflowQueue("all");
    if (!status && queueKey !== "all") {
      applyQueueFilter(where, queueKey);
      activeQueue = getWorkflowQueue(queueKey);
    }

    const statusesParam = request.nextUrl.searchParams.get("statuses");
    if (!status && !queue && !stage && statusesParam) {
      const list = statusesParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) {
        where.status = { in: list as Prisma.EnumProcurementStatusFilter["in"] };
      }
    }

    if (bidTypeId) where.bidTypeId = bidTypeId;
    if (dateFrom || dateTo) {
      where.noticeDate = {};
      if (dateFrom) where.noticeDate.gte = dateOnlyToDb(dateFrom);
      if (dateTo) where.noticeDate.lte = dateOnlyToDb(dateTo);
    }

    const orderBy: Prisma.ProcurementOrderByWithRelationInput = {
      [sort]: order,
    };

    const [total, rows] = await Promise.all([
      prisma.procurement.count({ where }),
      prisma.procurement.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          bidType: true,
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
