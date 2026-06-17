import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  buildQueueWhere,
  SIDEBAR_COUNT_QUEUES,
  type WorkflowQueueKey,
} from "@/lib/procurement/workflow-queues";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.view");

    const counts = await Promise.all(
      SIDEBAR_COUNT_QUEUES.map(async (queue) => {
        const total = await prisma.procurement.count({
          where: buildQueueWhere(queue.key),
        });
        return [queue.key, total] as const;
      }),
    );

    return jsonOk({
      counts: Object.fromEntries(counts) as Partial<Record<WorkflowQueueKey, number>>,
    });
  });
}
