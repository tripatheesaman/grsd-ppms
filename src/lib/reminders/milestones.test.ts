import { describe, expect, it } from "vitest";
import { isMilestoneWorkflowComplete } from "@/lib/reminders/milestones";

describe("isMilestoneWorkflowComplete", () => {
  it("marks prebid complete after PREBID_OPEN", () => {
    expect(
      isMilestoneWorkflowComplete(
        { status: "PREBID_OPEN", prebidAcknowledgedAt: "2025-08-14" },
        "prebidDate",
      ),
    ).toBe(true);
  });

  it("marks bid open complete after BID_OPEN_DAY", () => {
    expect(
      isMilestoneWorkflowComplete(
        { status: "BID_OPEN_DAY", bidOpenAcknowledgedAt: "2025-08-29" },
        "bidOpenDate",
      ),
    ).toBe(true);
    expect(
      isMilestoneWorkflowComplete(
        { status: "BID_CLOSED", bidOpenAcknowledgedAt: "2025-08-29" },
        "bidFeeSubmissionDate",
      ),
    ).toBe(true);
  });

  it("keeps prebid milestone active while still ACTIVE", () => {
    expect(isMilestoneWorkflowComplete({ status: "ACTIVE" }, "prebidDate")).toBe(false);
  });
});
