import { describe, expect, it } from "vitest";

import { calculatePriceBidOpenDate, isPriceBidWorkingDay } from "@/lib/procurement/price-bid-date";
import type { CalendarContext } from "@/lib/calendar/working-days";

const calendar: CalendarContext = {
  weeklyOffRules: [],
  publicHolidays: [{ year: 2026, month: 6, day: 5 }],
  defaultOffDays: [0, 6],
};

describe("price bid open date", () => {
  it("returns a working day after the configured offset", () => {
    const open = calculatePriceBidOpenDate("2026-06-01", 7, calendar);
    expect(open).toBe("2026-06-08");
    expect(isPriceBidWorkingDay(open, calendar)).toBe(true);
  });

  it("snaps to the next working day when the landing date is non-working", () => {
    const open = calculatePriceBidOpenDate("2026-05-29", 7, calendar);
    expect(isPriceBidWorkingDay(open, calendar)).toBe(true);
  });

  it("rejects holidays", () => {
    expect(isPriceBidWorkingDay("2026-06-05", calendar)).toBe(false);
  });
});
