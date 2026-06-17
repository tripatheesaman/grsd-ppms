import { describe, expect, it } from "vitest";
import {
  calculateBidFee,
  calculateBidSecurity,
  calculateValidityDays,
  roundBidSecurity,
} from "@/lib/formulas/index";
import type { AppSettings } from "@/lib/settings";

const settings: AppSettings = {
  vatPercent: 13,
  bsfMinPercent: 2,
  bsfMaxPercent: 3,
  bsfDefaultPercent: 2.5,
  prebidOffsetDays: 15,
  completionBufferDays: 30,
  loaDelayDays: 7,
  pgDiscountThresholdPercent: 15,
  pgLowDiscountRatePercent: 5,
  pgFrontLoadingCostFactor: 0.85,
  pgFrontLoadingRate: 0.5,
  pgValidityExtensionDays: 0,
  defaultPrebidTime: "12:00",
  defaultBidSubmissionTime: "16:00",
  defaultBidOpenTime: "14:00",
  weeklyDefaultOffDays: [0, 6],
  bidFeeTiers: [
    { maxInclusive: 2000000, fee: 1000 },
    { maxInclusive: 20000000, fee: 3000 },
    { maxInclusive: 100000000, fee: 5000 },
    { maxInclusive: 250000000, fee: 10000 },
    { maxInclusive: null, fee: 20000 },
  ],
  validityTiers: [
    { maxInclusive: 100000000, days: 90 },
    { maxInclusive: null, days: 120 },
  ],
  letterDefaultCcLines: [],
  departmentWitnesses: [],
  departmentSigningAuthorities: [],
  departmentWitnessName: "",
  departmentWitnessDesignation: "",
  departmentSigningAuthorityName: "",
  departmentSigningAuthorityDesignation: "",
};

describe("formulas", () => {
  it("calculates bid fee tiers", () => {
    expect(calculateBidFee(1000000, settings)).toBe(1000);
    expect(calculateBidFee(50000000, settings)).toBe(5000);
  });

  it("calculates validity days", () => {
    expect(calculateValidityDays(50000000, settings)).toBe(90);
    expect(calculateValidityDays(200000000, settings)).toBe(120);
  });

  it("rounds bid security to nearest thousand", () => {
    expect(roundBidSecurity(607273.19)).toBe(607000);
    expect(roundBidSecurity(380966.99064)).toBe(381000);
    expect(calculateBidSecurity(15873624.61, 2.4)).toBe(381000);
    expect(calculateBidSecurity(10000000, 2.5)).toBe(250000);
  });
});
