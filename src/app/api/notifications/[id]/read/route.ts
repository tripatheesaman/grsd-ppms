import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const { id } = await context.params;
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    return jsonOk({ success: true });
  });
}
