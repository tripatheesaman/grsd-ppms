import { prisma } from "@/lib/prisma";
import type { CalendarContext, PublicHoliday, WeeklyOffRule } from "@/lib/calendar/working-days";
import { loadSettings } from "@/lib/settings";

export async function loadCalendarContext(): Promise<CalendarContext> {
  const settings = await loadSettings();
  const weeklyOffRules = await prisma.weeklyOffRule.findMany();
  const publicHolidays = await prisma.publicHoliday.findMany();
  return {
    weeklyOffRules: weeklyOffRules.map((r) => ({
      year: r.year,
      month: r.month,
      dayFrom: r.dayFrom,
      dayTo: r.dayTo,
      offDays: r.offDays as number[],
    })),
    publicHolidays: publicHolidays.map(
      (h): PublicHoliday => ({
        year: h.year,
        month: h.month,
        day: h.day,
      }),
    ),
    defaultOffDays: settings.weeklyDefaultOffDays,
  };
}
