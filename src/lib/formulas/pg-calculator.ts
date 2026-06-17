export type PgFormulaSettings = {
  /** Bid discount % at or above this uses front-loading (default 15). */
  pgDiscountThresholdPercent: number;
  /** Flat PG rate when discount is below threshold (default 5% of bid ex-VAT). */
  pgLowDiscountRatePercent: number;
  /** Cost factor in front-loading formula (default 0.85). */
  pgFrontLoadingCostFactor: number;
  /** Multiplier in front-loading formula (default 0.5). */
  pgFrontLoadingRate: number;
};

export const DEFAULT_PG_FORMULA: PgFormulaSettings = {
  pgDiscountThresholdPercent: 15,
  pgLowDiscountRatePercent: 5,
  pgFrontLoadingCostFactor: 0.85,
  pgFrontLoadingRate: 0.5,
};

export type PgCalculationInput = {
  costEstimateWithoutVat: number;
  bidAmountWithoutVat: number;
};

export type PgCalculationResult = {
  pgAmount: number;
  /** 5% of bid ex-VAT (always included when front loading applies). */
  basePgAmount: number;
  /** Front-loading component (zero when discount is below threshold). */
  frontLoadingAmount: number;
  method: "low_discount" | "front_loading";
  /** Positive when bid is below cost; negative when bid is above cost. */
  discountPercent: number;
};

/** Variance of bid vs cost estimate (ex-VAT). Positive = bid is lower. */
export function bidVsCostVariancePercent(
  costEstimateWithoutVat: number,
  bidAmountWithoutVat: number,
): number | null {
  if (!Number.isFinite(costEstimateWithoutVat) || costEstimateWithoutVat <= 0) return null;
  if (!Number.isFinite(bidAmountWithoutVat) || bidAmountWithoutVat < 0) return null;
  return ((costEstimateWithoutVat - bidAmountWithoutVat) / costEstimateWithoutVat) * 100;
}

/** e.g. "60.1% lower than cost estimate" or "3.5% higher than cost estimate". */
export function formatBidVsCostEstimateLabel(
  costEstimateWithoutVat: number,
  bidAmountWithoutVat: number,
): string {
  const variance = bidVsCostVariancePercent(costEstimateWithoutVat, bidAmountWithoutVat);
  if (variance == null) return "—";
  const abs = Math.abs(variance).toFixed(1);
  if (Math.abs(variance) < 0.05) return `Same as cost estimate (${abs}%)`;
  if (variance > 0) return `${abs}% lower than cost estimate`;
  return `${abs}% higher than cost estimate`;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Fill missing/invalid PG formula fields (e.g. from older procurement snapshots). */
export function normalizePgFormulaSettings(
  settings?: Partial<PgFormulaSettings>,
): PgFormulaSettings {
  return {
    pgDiscountThresholdPercent: toFiniteNumber(
      settings?.pgDiscountThresholdPercent,
      DEFAULT_PG_FORMULA.pgDiscountThresholdPercent,
    ),
    pgLowDiscountRatePercent: toFiniteNumber(
      settings?.pgLowDiscountRatePercent,
      DEFAULT_PG_FORMULA.pgLowDiscountRatePercent,
    ),
    pgFrontLoadingCostFactor: toFiniteNumber(
      settings?.pgFrontLoadingCostFactor,
      DEFAULT_PG_FORMULA.pgFrontLoadingCostFactor,
    ),
    pgFrontLoadingRate: toFiniteNumber(
      settings?.pgFrontLoadingRate,
      DEFAULT_PG_FORMULA.pgFrontLoadingRate,
    ),
  };
}

export function calculatePgAmount(
  input: PgCalculationInput,
  settings?: Partial<PgFormulaSettings>,
): PgCalculationResult {
  const cost = input.costEstimateWithoutVat;
  const bid = input.bidAmountWithoutVat;
  const formula = normalizePgFormulaSettings(settings);

  if (cost <= 0 || bid < 0) {
    throw new Error("Cost estimate and bid amount must be positive");
  }

  const discountPercent = bidVsCostVariancePercent(cost, bid) ?? 0;
  const threshold = formula.pgDiscountThresholdPercent;
  const basePgAmount = roundMoney(bid * (formula.pgLowDiscountRatePercent / 100));

  if (discountPercent < threshold) {
    return {
      pgAmount: basePgAmount,
      basePgAmount,
      frontLoadingAmount: 0,
      method: "low_discount",
      discountPercent,
    };
  }

  const frontLoading = roundMoney(
    Math.max(
      0,
      (formula.pgFrontLoadingCostFactor * cost - bid) * formula.pgFrontLoadingRate,
    ),
  );

  return {
    pgAmount: roundMoney(basePgAmount + frontLoading),
    basePgAmount,
    frontLoadingAmount: frontLoading,
    method: "front_loading",
    discountPercent,
  };
}
