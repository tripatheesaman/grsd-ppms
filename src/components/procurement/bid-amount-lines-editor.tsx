"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { isNprCurrency } from "@/lib/procurement/bid-amount-lines";

export type BidAmountLineDraft = {
  key: string;
  currencyId: string;
  amount: string;
  forexRate: string;
};

type CurrencyOption = {
  id: string;
  code: string;
  symbol: string;
  sortOrder?: number;
};

type Props = {
  label: string;
  optional?: boolean;
  lines: BidAmountLineDraft[];
  currencies: CurrencyOption[];
  defaultCurrencyId: string;
  onChange: (lines: BidAmountLineDraft[]) => void;
};

function createLine(defaultCurrencyId: string): BidAmountLineDraft {
  return {
    key: crypto.randomUUID(),
    currencyId: defaultCurrencyId,
    amount: "",
    forexRate: "",
  };
}

function computeDraftTotal(lines: BidAmountLineDraft[], currencies: CurrencyOption[]): number {
  let total = 0;
  for (const line of lines) {
    const amount = Number(line.amount);
    if (!amount || amount <= 0) continue;
    const code = currencies.find((c) => c.id === line.currencyId)?.code ?? "";
    if (isNprCurrency(code)) {
      total += amount;
      continue;
    }
    const forex = Number(line.forexRate);
    if (!forex || forex <= 0) continue;
    total += amount * forex;
  }
  return Math.round(total * 100) / 100;
}

export function BidAmountLinesEditor({
  label,
  optional = false,
  lines,
  currencies,
  defaultCurrencyId,
  onChange,
}: Props) {
  const totalNpr = useMemo(() => computeDraftTotal(lines, currencies), [lines, currencies]);

  function updateLine(key: string, patch: Partial<BidAmountLineDraft>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addLine() {
    onChange([...lines, createLine(defaultCurrencyId)]);
  }

  function removeLine(key: string) {
    if (lines.length <= 1) return;
    onChange(lines.filter((line) => line.key !== key));
  }

  return (
    <div className="col-span-full space-y-3 rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-text)]">
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-[var(--color-text-soft)]">(optional)</span>
          ) : null}
        </p>
        <p className="text-sm text-[var(--color-text-soft)]">
          Total (NPR):{" "}
          <strong className="text-[var(--color-text)]">{formatCurrency(totalNpr)}</strong>
        </p>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const code = currencies.find((c) => c.id === line.currencyId)?.code ?? "";
          const needsForex = code.length > 0 && !isNprCurrency(code);
          return (
            <div
              key={line.key}
              className="grid gap-3 rounded-md bg-[var(--color-surface-strong)]/40 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <Select
                label={index === 0 ? "Currency" : undefined}
                value={line.currencyId}
                onChange={(e) =>
                  updateLine(line.key, {
                    currencyId: e.target.value,
                    forexRate: "",
                  })
                }
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </Select>
              <Input
                label={index === 0 ? "Amount" : undefined}
                type="number"
                step="0.01"
                min="0.01"
                value={line.amount}
                onChange={(e) => updateLine(line.key, { amount: e.target.value })}
              />
              <Input
                label={index === 0 ? "Forex (NPR per 1 unit)" : undefined}
                type="number"
                step="0.0001"
                min="0.0001"
                value={line.forexRate}
                disabled={!needsForex}
                placeholder={needsForex ? "Required" : "N/A for NPR"}
                onChange={(e) => updateLine(line.key, { forexRate: e.target.value })}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(line.key)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addLine}>
        Add currency line
      </Button>
    </div>
  );
}

export function createBidAmountLineDraft(defaultCurrencyId: string): BidAmountLineDraft {
  return createLine(defaultCurrencyId);
}

export function draftLinesToPayload(
  lines: BidAmountLineDraft[],
  currencies: CurrencyOption[],
): Array<{ currencyId: string; amount: number; forexRate?: number | null }> {
  const payload: Array<{ currencyId: string; amount: number; forexRate?: number | null }> = [];
  for (const line of lines) {
    const amount = Number(line.amount);
    if (!amount || amount <= 0) continue;
    const code = currencies.find((c) => c.id === line.currencyId)?.code ?? "";
    payload.push({
      currencyId: line.currencyId,
      amount,
      forexRate: isNprCurrency(code) ? null : Number(line.forexRate) || null,
    });
  }
  return payload;
}

export function payloadToDraftLines(
  lines: Array<{
    currencyId: string | null;
    amount: number;
    forexRate: number | null;
  }>,
  defaultCurrencyId: string,
): BidAmountLineDraft[] {
  if (lines.length === 0) {
    return [createLine(defaultCurrencyId)];
  }
  return lines.map((line) => ({
    key: crypto.randomUUID(),
    currencyId: line.currencyId ?? defaultCurrencyId,
    amount: String(line.amount),
    forexRate: line.forexRate != null ? String(line.forexRate) : "",
  }));
}
