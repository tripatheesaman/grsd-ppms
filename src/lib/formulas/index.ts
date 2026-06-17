import type { AppSettings, BidFeeTier, ValidityTier } from "@/lib/settings";

export function vatInclusiveAmount(costEstimate: number, vatPercent: number): number {
  return costEstimate * (1 + vatPercent / 100);
}

export function calculateBidFee(costEstimate: number, settings: AppSettings): number {
  const amount = vatInclusiveAmount(costEstimate, settings.vatPercent);
  for (const tier of settings.bidFeeTiers) {
    if (tier.maxInclusive === null || amount < tier.maxInclusive) {
      return tier.fee;
    }
  }
  const last = settings.bidFeeTiers[settings.bidFeeTiers.length - 1];
  return last?.fee ?? 0;
}

export function calculateValidityDays(costEstimate: number, settings: AppSettings): number {
  const amount = vatInclusiveAmount(costEstimate, settings.vatPercent);
  for (const tier of settings.validityTiers) {
    if (tier.maxInclusive === null || amount < tier.maxInclusive) {
      return tier.days;
    }
  }
  const last = settings.validityTiers[settings.validityTiers.length - 1];
  return last?.days ?? 90;
}

export function roundBidSecurity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rupees = Math.round(value * 100) / 100;
  return Math.round(rupees / 1000) * 1000;
}

export function calculateBidSecurity(costEstimate: number, bsfPercent: number): number {
  const estimate = Number(costEstimate);
  const bsf = Number(bsfPercent);
  return roundBidSecurity(estimate * (bsf / 100));
}

export function calculateGrandTotalWithVat(costEstimate: number, vatPercent: number): number {
  return costEstimate + costEstimate * (vatPercent / 100);
}

export function resolveTierValue<T extends { maxInclusive: number | null }>(
  amount: number,
  tiers: T[],
  pick: (tier: T) => number,
): number {
  for (const tier of tiers) {
    if (tier.maxInclusive === null || amount < tier.maxInclusive) {
      return pick(tier);
    }
  }
  const last = tiers[tiers.length - 1];
  return last ? pick(last) : 0;
}

export type { BidFeeTier, ValidityTier };
