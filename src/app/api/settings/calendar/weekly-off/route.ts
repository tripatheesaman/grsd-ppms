import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  dayFrom: z.number().int().min(1).max(31),
  dayTo: z.number().int().min(1).max(31),
  offDays: z.array(z.number().int().min(0).max(6)),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const year = Number(request.nextUrl.searchParams.get("year"));
    const month = Number(request.nextUrl.searchParams.get("month"));
    const where =
      year && month ? { year, month } : year ? { year } : {};
    const rows = await prisma.weeklyOffRule.findMany({ where, orderBy: [{ year: "asc" }, { month: "asc" }] });
    return jsonOk(rows);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = schema.parse(await request.json());
    const row = await prisma.weeklyOffRule.create({ data: body });
    return jsonOk(row, 201);
  });
}
