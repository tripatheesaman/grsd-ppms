import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "audit.view");
    const params = parsePagination(request.nextUrl.searchParams);
    const entityType = request.nextUrl.searchParams.get("entityType");
    const where = entityType ? { entityType } : {};
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, fullName: true } } },
      }),
    ]);
    return jsonOk({ data: rows, meta: paginationMeta(total, params) });
  });
}
