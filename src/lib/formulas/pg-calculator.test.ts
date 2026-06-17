import { describe, expect, it } from "vitest";

import { calculatePgAmount, formatBidVsCostEstimateLabel } from "@/lib/formulas/pg-calculator";

describe("calculatePgAmount", () => {
  it("uses low discount rate when bid discount is below 15%", () => {
    const cost = 1_000_000;
    const bid = 900_000;
    const result = calculatePgAmount({ costEstimateWithoutVat: cost, bidAmountWithoutVat: bid });
    expect(result.method).toBe("low_discount");
    expect(result.pgAmount).toBe(45_000);
  });

  it("uses front loading on top of 5% of bid when discount is 15% or more", () => {
    const cost = 1_000_000;
    const bid = 800_000;
    const result = calculatePgAmount({ costEstimateWithoutVat: cost, bidAmountWithoutVat: bid });
    expect(result.method).toBe("front_loading");
    expect(result.basePgAmount).toBe(40_000); // 5% of bid
    expect(result.frontLoadingAmount).toBe(25_000); // (850_000 - 800_000) * 0.5
    expect(result.pgAmount).toBe(65_000);
  });

  it("at exactly 15% discount uses base PG only when front loading is zero", () => {
    const cost = 1_000_000;
    const bid = 850_000;
    const result = calculatePgAmount({ costEstimateWithoutVat: cost, bidAmountWithoutVat: bid });
    expect(result.method).toBe("front_loading");
    expect(result.basePgAmount).toBe(42_500);
    expect(result.frontLoadingAmount).toBe(0);
    expect(result.pgAmount).toBe(42_500);
  });

  it("uses defaults when PG formula settings are missing from snapshot", () => {
    const cost = 1_000_000;
    const bid = 399_000; // 60.1% discount → front loading
    const result = calculatePgAmount(
      { costEstimateWithoutVat: cost, bidAmountWithoutVat: bid },
      {},
    );
    expect(result.method).toBe("front_loading");
    expect(Number.isFinite(result.pgAmount)).toBe(true);
    expect(result.pgAmount).toBe(245_450); // 19_950 + (850_000 - 399_000) * 0.5
  });

  it("formats bid variance as lower or higher than cost estimate", () => {
    expect(formatBidVsCostEstimateLabel(1_000_000, 399_000)).toBe(
      "60.1% lower than cost estimate",
    );
    expect(formatBidVsCostEstimateLabel(1_000_000, 1_050_000)).toBe(
      "5.0% higher than cost estimate",
    );
    expect(formatBidVsCostEstimateLabel(1_000_000, 1_000_000)).toBe(
      "Same as cost estimate (0.0%)",
    );
  });
});
