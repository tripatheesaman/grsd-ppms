import { describe, expect, it } from "vitest";
import { formatDualDate } from "@/lib/dates/display";
import { buildScheduledEntries, buildTimelineEntries, sortDateEntries } from "@/lib/procurement/detail-display";

function entry(label: string, date: string) {
  return { label, date, displayDate: formatDualDate(date) };
}

describe("detail-display", () => {
  it("sorts timeline dates ascending", () => {
    const sorted = sortDateEntries([
      entry("Bid open", "2025-08-29"),
      entry("Notice", "2025-07-15"),
      entry("Pre-bid", "2025-08-14"),
    ]);
    expect(sorted.map((e) => e.label)).toEqual(["Notice", "Pre-bid", "Bid open"]);
  });

  it("excludes work dates from timeline and lists them under scheduled", () => {
    const proc = {
      noticeDate: "2025-07-15",
      prebidDate: "2025-08-14",
      bidFeeSubmissionDate: "2025-08-29",
      bidOpenDate: "2025-08-29",
      bidValidityDate: "2025-11-27",
      scheduledInitiationDate: "2025-10-29",
      scheduledCompletionDate: "2026-08-05",
    };
    const timeline = buildTimelineEntries(proc);
    const scheduled = buildScheduledEntries(proc);

    expect(timeline.some((e) => e.label.includes("Work"))).toBe(false);
    expect(scheduled.map((e) => e.date)).toEqual(["2025-10-29", "2026-08-05"]);
    expect(timeline[0]?.date).toBe("2025-07-15");
    expect(timeline[timeline.length - 1]?.date).toBe("2025-11-27");
  });
});
