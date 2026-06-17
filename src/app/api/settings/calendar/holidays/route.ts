import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  adToBs,
  holidayMatchesBsMonth,
} from "@/lib/calendar/bs-calendar";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  label: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const bsYear = Number(request.nextUrl.searchParams.get("bsYear"));
    const bsMonth = Number(request.nextUrl.searchParams.get("bsMonth"));
    const year = Number(request.nextUrl.searchParams.get("year"));
    const month = Number(request.nextUrl.searchParams.get("month"));

    if (bsYear && bsMonth) {
      const all = await prisma.publicHoliday.findMany({
        orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
      });
      const rows = all
        .filter((h) => holidayMatchesBsMonth(h, bsYear, bsMonth))
        .map((h) => {
          const ad = `${h.year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
          const bsDay = Number(adToBs(ad).split("-")[2]);
          return { ...h, bsDay };
        })
        .sort((a, b) => a.bsDay - b.bsDay);
      return jsonOk(rows);
    }

    const where = year && month ? { year, month } : year ? { year } : {};
    const rows = await prisma.publicHoliday.findMany({
      where,
      orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
    });
    return jsonOk(rows);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = schema.parse(await request.json());
    const row = await prisma.publicHoliday.create({
      data: {
        ...body,
        label: body.label ?? "Holiday",
      },
    });
    return jsonOk(row, 201);
  });
}
