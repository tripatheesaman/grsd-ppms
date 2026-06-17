import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const params = parsePagination(request.nextUrl.searchParams);
    const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
    const where = {
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return jsonOk({ data: rows, meta: paginationMeta(total, params) });
  });
}
