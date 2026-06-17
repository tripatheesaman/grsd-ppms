import { describe, expect, it } from "vitest";
import { buildCcBlock } from "@/lib/documents/bidder-letter-placeholders";
import {
  countTechnicalLetterGenerations,
  planTechnicalLetterGenerations,
} from "@/lib/documents/technical-letters";

const technicalResults = [
  { id: "1", passedTech: true as const },
  { id: "2", passedTech: true as const },
  { id: "3", passedTech: false as const },
  { id: "4", passedTech: false as const },
  { id: "5", passedTech: false as const },
];

const fiveBidders = [
  { id: "1", name: "Bidder 1", address: "Addr 1" },
  { id: "2", name: "Bidder 2", address: "Addr 2" },
  { id: "3", name: "Bidder 3", address: "Addr 3" },
  { id: "4", name: "Bidder 4", address: "Addr 4" },
  { id: "5", name: "Bidder 5", address: "Addr 5" },
];

describe("technical letter generation", () => {
  it("plans 2 LOI and 3 rejection letters for 2 pass / 3 fail", () => {
    const jobs = planTechnicalLetterGenerations(technicalResults);
    expect(jobs).toHaveLength(5);
    expect(jobs.filter((j) => j.documentType === "loi-pass")).toHaveLength(2);
    expect(jobs.filter((j) => j.documentType === "loi-fail")).toHaveLength(3);
  });

  it("counts generation totals", () => {
    expect(countTechnicalLetterGenerations(technicalResults)).toEqual({
      passed: 2,
      failed: 3,
      total: 5,
    });
  });

  it("CC for bidder 1 lists bidders 2–5 without leading spaces", () => {
    const cc = buildCcBlock(fiveBidders.filter((b) => b.id !== "1"));
    expect(cc).not.toMatch(/\n\s{4,}M\/S/);
    expect(cc).toContain("Bidder 2");
    expect(cc).toContain("Bidder 5");
    expect(cc).not.toContain("Bidder 1");
  });

  it("CC for failed bidder 3 lists 1, 2, 4, 5", () => {
    const cc = buildCcBlock(fiveBidders.filter((b) => b.id !== "3"));
    expect(cc).toContain("Bidder 1");
    expect(cc).toContain("Bidder 2");
    expect(cc).toContain("Bidder 4");
    expect(cc).toContain("Bidder 5");
    expect(cc).not.toContain("Bidder 3");
  });
});
