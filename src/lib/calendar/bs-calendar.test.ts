import { describe, expect, it } from "vitest";
import { adToBs, bsToAd, listBsMonthDays, shiftBsMonth } from "@/lib/calendar/bs-calendar";

describe("bs-calendar", () => {
  it("maps anchor AD to anchor BS", () => {
    expect(adToBs("1944-04-13")).toBe("2001-01-01");
    expect(bsToAd("2001-01-01")).toBe("1944-04-13");
  });

  it("round-trips a modern procurement date", () => {
    const ad = "2025-07-15";
    const bs = adToBs(ad);
    expect(bsToAd(bs)).toBe(ad);
  });

  it("maps a sample procurement date to BS", () => {
    expect(adToBs("2025-07-15")).toBe("2082-03-31");
  });

  it("lists BS month days with weekdays", () => {
    const days = listBsMonthDays(2082, 1);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ bsDay: 1, adDate: "2025-04-14", weekday: 1 });
    expect(days[30]?.bsDay).toBe(31);
  });

  it("shifts BS months", () => {
    expect(shiftBsMonth(2082, 1, 1)).toEqual({ year: 2082, month: 2 });
    expect(shiftBsMonth(2082, 1, -1)).toEqual({ year: 2081, month: 12 });
  });
});
