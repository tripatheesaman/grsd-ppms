import { ProcurementStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  formatToday,
  validateBidderEntry,
  validateWorkflowTransition,
} from "./workflow-date-validation";

describe("workflow date validation", () => {
  const today = formatToday();

  it("blocks pre-bid before scheduled prebid date", () => {
    const result = validateWorkflowTransition(
      { status: ProcurementStatus.ACTIVE, prebidDate: "2099-01-01" },
      ProcurementStatus.PREBID_OPEN,
    );
    expect(result.allowed).toBe(false);
  });

  it("allows bid open when bid open date is today", () => {
    const result = validateWorkflowTransition(
      { status: ProcurementStatus.PREBID_OPEN, bidOpenDate: today },
      ProcurementStatus.BID_OPEN_DAY,
      { payload: { bidOpenAcknowledgedAt: today } },
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks bidder entry before bid open date", () => {
    const result = validateBidderEntry({
      status: ProcurementStatus.BID_OPEN_DAY,
      bidOpenDate: "2099-06-01",
    });
    expect(result.allowed).toBe(false);
  });
});
