import { describe, expect, it } from "vitest";
import {
  buildBidderLetterPlaceholders,
  buildBidderOnlyCcBlock,
  buildBidderOnlyCcLines,
  buildCcBlock,
  buildCcParticipantLines,
} from "@/lib/documents/bidder-letter-placeholders";

const bidders = [
  { id: "a", name: "Alpha Traders", address: "Kathmandu", phone: "9800000001" },
  { id: "b", name: "Beta Supplies", address: "Lalitpur", phone: "9800000002" },
  { id: "c", name: "Gamma Corp", address: "Bhaktapur", phone: null },
];

const defaultCc = ["Procurement Section, GRSD", "Finance Unit, TIA"];

describe("bidder letter CC placeholders", () => {
  it("cc_block puts defaults after CC: header, before bidders", () => {
    const block = buildCcBlock(bidders.filter((b) => b.id !== "b"), defaultCc);
    expect(block).toBe(
      "CC:\nProcurement Section, GRSD\nFinance Unit, TIA\nM/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur",
    );
  });

  it("cc_lines matches cc_block body without CC: header", () => {
    const lines = buildCcParticipantLines(bidders.filter((b) => b.id !== "b"), defaultCc);
    expect(lines).toBe(
      "Procurement Section, GRSD\nFinance Unit, TIA\nM/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur",
    );
  });

  it("bidder-only cc excludes default recipients", () => {
    const lines = buildBidderOnlyCcLines(bidders.filter((b) => b.id !== "b"));
    const block = buildBidderOnlyCcBlock(bidders.filter((b) => b.id !== "b"));
    expect(lines).toBe("M/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur");
    expect(block).toBe("CC:\nM/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur");
  });

  it("cc_block with only defaults when sole bidder", () => {
    expect(
      buildCcBlock([], defaultCc),
    ).toBe("CC:\nProcurement Section, GRSD\nFinance Unit, TIA");
  });

  it("returns empty cc_block when no defaults and no other bidders", () => {
    expect(buildBidderLetterPlaceholders([bidders[0]!], "a", { withCc: true }).cc_block).toBe("");
  });

  it("includes suppliername and unified cc_block when withCc", () => {
    const map = buildBidderLetterPlaceholders(bidders, "b", {
      withCc: true,
      defaultCcLines: defaultCc,
    });
    expect(map.suppliername).toBe("Beta Supplies");
    expect(map.cc_block).toMatch(/^CC:\n/);
    expect(map.cc_block.indexOf("Procurement Section")).toBeLessThan(
      map.cc_block.indexOf("Alpha Traders"),
    );
    expect(map.cc_block).not.toContain("Beta Supplies");
    expect(map.cc_lines).toBe(map.cc_block.slice("CC:\n".length));
    expect(map.cc_bidders_only).toBe("CC:\nM/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur");
    expect(map.cc_bidders_only_lines).toBe("M/S Alpha Traders, Kathmandu\nM/S Gamma Corp, Bhaktapur");
  });

  it("omits cc when withCc is false", () => {
    const map = buildBidderLetterPlaceholders(bidders, "a", {
      withCc: false,
      defaultCcLines: defaultCc,
    });
    expect(map.cc_block).toBe("");
    expect(map.cc_lines).toBe("");
    expect(map.cc_bidders_only).toBe("");
    expect(map.cc_bidders_only_lines).toBe("");
  });
});
