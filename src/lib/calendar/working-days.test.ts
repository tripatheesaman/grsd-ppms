import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  isWorkingDay,
  nextWorkingDay,
  subtractWorkingDays,
} from "@/lib/calendar/working-days";
import { parseDateOnly } from "@/lib/dates";

const context = {
  defaultOffDays: [0, 6],
  weeklyOffRules: [
    {
      year: 2026,
      month: 4,
      dayFrom: 1,
      dayTo: 10,
      offDays: [0, 6],
    },
    {
      year: 2026,
      month: 4,
      dayFrom: 13,
      dayTo: 20,
      offDays: [6],
    },
  ],
  publicHolidays: [{ year: 2026, month: 4, day: 14 }],
};

describe("working-days", () => {
  it("detects saturday sunday off in range", () => {
    expect(isWorkingDay(parseDateOnly("2026-04-05"), context)).toBe(false);
    expect(isWorkingDay(parseDateOnly("2026-04-06"), context)).toBe(true);
  });

  it("detects public holiday", () => {
    expect(isWorkingDay(parseDateOnly("2026-04-14"), context)).toBe(false);
  });

  it("skips to next working day", () => {
    const result = nextWorkingDay(parseDateOnly("2026-04-05"), context);
    expect(result.getDate()).toBe(6);
  });

  it("adds calendar days without skipping holidays in between", () => {
    const withMiddleHoliday = {
      ...context,
      publicHolidays: [
        { year: 2026, month: 4, day: 7 },
        { year: 2026, month: 4, day: 14 },
      ],
    };
    const result = addWorkingDays(parseDateOnly("2026-04-06"), 2, withMiddleHoliday);
    expect(result.getDate()).toBe(8);
  });

  it("adjusts forward when landing date is a public holiday", () => {
    const janContext = {
      defaultOffDays: [0, 6],
      weeklyOffRules: [],
      publicHolidays: [{ year: 2026, month: 1, day: 8 }],
    };
    const result = addWorkingDays(parseDateOnly("2026-01-06"), 2, janContext);
    expect(result.getDate()).toBe(9);
  });

  it("adjusts backward when landing date is a public holiday", () => {
    const janContext = {
      defaultOffDays: [0, 6],
      weeklyOffRules: [],
      publicHolidays: [{ year: 2026, month: 1, day: 1 }],
    };
    const result = subtractWorkingDays(parseDateOnly("2026-01-16"), 15, janContext);
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(11);
  });

  it("uses default weekly off when no month override exists", () => {
    expect(isWorkingDay(parseDateOnly("2026-05-03"), context)).toBe(false);
  });
});
