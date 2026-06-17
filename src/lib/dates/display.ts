import { adToBs } from "@/lib/calendar/bs-calendar";

const AD_DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export const BS_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashar",
  "Shrawan",
  "Bhadra",
  "Asoj",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chait",
] as const;

export function extractAdDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = AD_DATE_ONLY_RE.exec(value.trim());
  return match ? match[0] : null;
}

export function formatBsMonthYear(bsYear: number, bsMonth: number): string {
  const monthName = BS_MONTH_NAMES[bsMonth - 1] ?? String(bsMonth);
  return `${monthName} ${bsYear}`;
}

export function formatBsDate(bsStr: string): string {
  const [y, m, d] = bsStr.split("-").map(Number);
  const monthName = BS_MONTH_NAMES[m - 1] ?? String(m);
  return `${d} ${monthName} ${y}`;
}

export function formatAdDate(adStr: string): string {
  const [y, m, d] = adStr.split("-").map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString("en-GB", { month: "short" });
  return `${d} ${month} ${y}`;
}

export function adToBsDateOnly(adStr: string): string | null {
  const ad = extractAdDateOnly(adStr);
  if (!ad) return null;
  try {
    return adToBs(ad);
  } catch {
    return null;
  }
}

export function adToBsFormatted(adStr: string): string | null {
  const bs = adToBsDateOnly(adStr);
  if (!bs) return null;
  return formatBsDate(bs);
}

export function formatDualDate(value: string | null | undefined): string {
  if (!value) return "—";
  const ad = extractAdDateOnly(value);
  if (!ad) return value;
  try {
    const bs = adToBs(ad);
    return `${formatAdDate(ad)} · ${formatBsDate(bs)}`;
  } catch {
    return ad;
  }
}

export function formatDualDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const ad = extractAdDateOnly(value);
  if (!ad) return value;
  try {
    return `${ad} (${adToBs(ad)} BS)`;
  } catch {
    return ad;
  }
}
