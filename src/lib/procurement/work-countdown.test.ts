import { describe, expect, it } from "vitest";

import {
  calculateElapsedWorkDays,
  calculateWorkCountdown,
  countWorkingDaysInclusive,
} from "@/lib/procurement/work-countdown";

const calendar = {
  weeklyOffRules: [],
  publicHolidays: [],
  defaultOffDays: [0, 6],
};

describe("work countdown", () => {
  it("counts working days Mon–Fri only", () => {
    // 2026-06-01 is Monday
    const count = countWorkingDaysInclusive(
      new Date("2026-06-01"),
      new Date("2026-06-07"),
      calendar,
    );
    expect(count).toBe(5);
  });

  it("excludes PDI window from elapsed days", () => {
    const elapsed = calculateElapsedWorkDays(
      "2026-06-01",
      "2026-06-12",
      calendar,
      "2026-06-04",
      "2026-06-06",
    );
    // Jun 1–12: 10 working days total; Thu 4 and Fri 5 fall in PDI and are excluded → 8
    expect(elapsed).toBe(8);
  });

  it("pauses elapsed during PDI phase", () => {
    const state = calculateWorkCountdown(
      {
        poIssueDate: "2026-06-01",
        pdiStartDate: "2026-06-04",
        pdiEndDate: null,
        totalWorkDays: 30,
        status: "PDI_PHASE",
        frozenElapsedDays: 3,
      },
      calendar,
      "2026-06-20",
    );
    expect(state?.elapsedDays).toBe(3);
    expect(state?.isPaused).toBe(true);
  });
});
