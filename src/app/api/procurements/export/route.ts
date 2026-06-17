import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { handleRoute } from "@/lib/api/response";
import { buildProcurementWorkbook } from "@/lib/export/procurement-excel";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.export");
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const status = request.nextUrl.searchParams.get("status");
    const where: Prisma.ProcurementWhereInput = {};
    if (search) {
      where.OR = [{ title: { contains: search } }, { itemName: { contains: search } }];
    }
    if (status) where.status = status as Prisma.EnumProcurementStatusFilter["equals"];
    const stage = request.nextUrl.searchParams.get("stage");
    const queue = request.nextUrl.searchParams.get("queue");
    if (!status && (queue || stage)) {
      const { statusesForQueue } = await import("@/lib/procurement/workflow-queues");
      const key = (queue ?? stage) as import("@/lib/procurement/workflow-queues").WorkflowQueueKey;
      const queueStatuses = statusesForQueue(key);
      if (queueStatuses?.length) {
        where.status = { in: queueStatuses };
      }
      const { getWorkflowQueue } = await import("@/lib/procurement/workflow-queues");
      const cfg = getWorkflowQueue(key);
      if (cfg.requiresPoIssued) where.poIssueDate = { not: null };
    }

    const rows = await prisma.procurement.findMany({
      where,
      include: { bidType: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const buffer = await buildProcurementWorkbook(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        itemName: r.itemName,
        status: r.status,
        costEstimate: Number(r.costEstimate),
        noticeDate: r.noticeDate,
        bidOpenDate: r.bidOpenDate,
        bidType: r.bidType,
      })),
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="procurements-${Date.now()}.xlsx"`,
      },
    });
  });
}
