import { calculatePriceBidOpenDate } from "@/lib/procurement/price-bid-date";
import { parseProcurementSettingsSnapshot } from "@/lib/procurement/settings-snapshot";

type BidTypeRef = { defaultPriceBidDays?: number } | null | undefined;

export function suggestPriceBidOpenDate(
  proc: Record<string, unknown>,
  baseDate?: string,
): string | null {
  const bidType = proc.bidType as BidTypeRef;
  const priceBidDays = bidType?.defaultPriceBidDays ?? 7;
  const snapshot = parseProcurementSettingsSnapshot(proc.settingsSnapshot);
  if (!snapshot?.calendar) return null;

  const fromDate = baseDate ?? new Date().toISOString().slice(0, 10);
  return calculatePriceBidOpenDate(fromDate, priceBidDays, snapshot.calendar);
}
