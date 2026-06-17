import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  adToBs,
  bsDayToAdParts,
  getDaysInBsMonth,
  holidayMatchesBsMonth,
} from "@/lib/calendar/bs-calendar";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const adSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  days: z.array(z.number().int().min(1).max(31)),
});

const bsSchema = z.object({
  bsYear: z.number().int(),
  bsMonth: z.number().int().min(1).max(12),
  days: z.array(z.number().int().min(1).max(32)),
});

const schema = z.union([adSchema, bsSchema]);

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = schema.parse(await request.json());

    if ("bsYear" in body) {
      const maxDay = getDaysInBsMonth(body.bsYear, body.bsMonth);
      const validDays = body.days.filter((d) => d >= 1 && d <= maxDay);

      await prisma.$transaction(async (tx) => {
        const all = await tx.publicHoliday.findMany();
        const toDelete = all.filter((h) =>
          holidayMatchesBsMonth(h, body.bsYear, body.bsMonth),
        );
        if (toDelete.length) {
          await tx.publicHoliday.deleteMany({
            where: { id: { in: toDelete.map((h) => h.id) } },
          });
        }
        if (validDays.length > 0) {
          await tx.publicHoliday.createMany({
            data: validDays.map((bsDay) => {
              const ad = bsDayToAdParts(body.bsYear, body.bsMonth, bsDay);
              return {
                year: ad.year,
                month: ad.month,
                day: ad.day,
                label: "Holiday",
              };
            }),
          });
        }
      });

      const rows = await prisma.publicHoliday.findMany({
        orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
      });
      return jsonOk(
        rows
          .filter((h) => holidayMatchesBsMonth(h, body.bsYear, body.bsMonth))
          .map((h) => {
            const ad = `${h.year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
            const bsDay = Number(adToBs(ad).split("-")[2]);
            return { ...h, bsDay };
          })
          .sort((a, b) => a.bsDay - b.bsDay),
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.publicHoliday.deleteMany({
        where: { year: body.year, month: body.month },
      });
      if (body.days.length > 0) {
        await tx.publicHoliday.createMany({
          data: body.days.map((day) => ({
            year: body.year,
            month: body.month,
            day,
            label: "Holiday",
          })),
        });
      }
    });

    const rows = await prisma.publicHoliday.findMany({
      where: { year: body.year, month: body.month },
      orderBy: { day: "asc" },
    });
    return jsonOk(rows);
  });
}
