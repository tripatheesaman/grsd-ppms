import { describe, expect, it } from "vitest";

import {
  BID_AMOUNT_KIND_WITHOUT_VAT,
  computeLineNprAmount,
  resolveBidAmountLines,
} from "./bid-amount-lines";

const currencies = [
  { id: "npr", code: "NPR", name: "Nepalese Rupee", isActive: true },
  { id: "usd", code: "USD", name: "US Dollar", isActive: true },
];

describe("bid amount lines", () => {
  it("converts foreign currency using forex", () => {
    expect(computeLineNprAmount(100, "USD", 132.5)).toBe(13250);
  });

  it("sums multiple lines into NPR total", () => {
    const result = resolveBidAmountLines(
      [
        { currencyId: "npr", amount: 1000 },
        { currencyId: "usd", amount: 100, forexRate: 130 },
      ],
      currencies,
      BID_AMOUNT_KIND_WITHOUT_VAT,
    );
    expect(result.totalNpr).toBe(14000);
    expect(result.lines).toHaveLength(2);
  });
});
