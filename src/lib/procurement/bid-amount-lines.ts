import { ApiError } from "@/lib/api/errors";

export const NPR_CURRENCY_CODE = "NPR";
export const BID_AMOUNT_KIND_WITHOUT_VAT = "WITHOUT_VAT";
export const BID_AMOUNT_KIND_WITH_VAT = "WITH_VAT";

export type BidAmountLineInput = {
  currencyId: string;
  amount: number;
  forexRate?: number | null;
};

export type ResolvedBidAmountLine = {
  currencyId: string | null;
  currencyCode: string;
  currencyName: string | null;
  amount: number;
  forexRate: number | null;
  nprAmount: number;
  sortOrder: number;
};

type CurrencyLookup = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isNprCurrency(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase() === NPR_CURRENCY_CODE;
}

export function computeLineNprAmount(
  amount: number,
  currencyCode: string,
  forexRate: number | null | undefined,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bid line amount must be greater than zero");
  }
  if (isNprCurrency(currencyCode)) {
    return roundMoney(amount);
  }
  if (!forexRate || !Number.isFinite(forexRate) || forexRate <= 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Forex rate is required for ${currencyCode} bid amounts`,
    );
  }
  return roundMoney(amount * forexRate);
}

export function resolveBidAmountLines(
  lines: BidAmountLineInput[],
  currencies: CurrencyLookup[],
  amountKind: string,
): { lines: ResolvedBidAmountLine[]; totalNpr: number } {
  if (lines.length === 0) {
    return { lines: [], totalNpr: 0 };
  }

  const currencyById = new Map(currencies.map((c) => [c.id, c]));
  const resolved: ResolvedBidAmountLine[] = [];
  let totalNpr = 0;

  lines.forEach((line, index) => {
    const currency = currencyById.get(line.currencyId);
    if (!currency || !currency.isActive) {
      throw new ApiError(400, "VALIDATION_ERROR", "Select a valid currency for each bid amount line");
    }

    const nprAmount = computeLineNprAmount(line.amount, currency.code, line.forexRate ?? null);
    totalNpr += nprAmount;
    resolved.push({
      currencyId: currency.id,
      currencyCode: currency.code,
      currencyName: currency.name,
      amount: line.amount,
      forexRate: isNprCurrency(currency.code) ? null : (line.forexRate ?? null),
      nprAmount,
      sortOrder: index,
    });
  });

  if (amountKind === BID_AMOUNT_KIND_WITHOUT_VAT && totalNpr <= 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Enter at least one bid amount without VAT",
    );
  }

  return { lines: resolved, totalNpr: roundMoney(totalNpr) };
}
