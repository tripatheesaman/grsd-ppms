import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/currency";

describe("formatCurrency", () => {
  it("places currency code before the amount", () => {
    expect(formatCurrency(15873624.61)).toMatch(/^NPR /);
    expect(formatCurrency(381000)).toBe("NPR 381,000");
  });

  it("returns em dash for empty values", () => {
    expect(formatCurrency(null)).toBe("—");
  });
});
