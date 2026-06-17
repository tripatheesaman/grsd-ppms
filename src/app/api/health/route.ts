import { prisma } from "@/lib/prisma";
import { handleRoute, jsonOk } from "@/lib/api/response";

export async function GET() {
  return handleRoute(async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
