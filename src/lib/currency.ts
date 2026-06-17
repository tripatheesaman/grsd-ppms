export const CURRENCY_CODE = "NPR";

type FormatCurrencyOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currencyCode?: string | null;
};

export function formatCurrency(
  value: number | null | undefined,
  options?: FormatCurrencyOptions,
): string {
  if (value == null) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  const formatted = new Intl.NumberFormat("en-NP", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);

  const code = options?.currencyCode?.trim() || CURRENCY_CODE;
  return `${code} ${formatted}`;
}

export function formatCurrencyForDocuments(
  value: number | null | undefined,
  currencyCode?: string | null,
): string {
  if (value == null) return "";
  return formatCurrency(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyCode,
  });
}
