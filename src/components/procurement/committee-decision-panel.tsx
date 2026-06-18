"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  BidAmountLinesEditor,
  createBidAmountLineDraft,
  draftLinesToPayload,
  payloadToDraftLines,
  type BidAmountLineDraft,
} from "@/components/procurement/bid-amount-lines-editor";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/error-message";
import {
  calculatePgAmount,
  formatBidVsCostEstimateLabel,
  normalizePgFormulaSettings,
} from "@/lib/formulas/pg-calculator";
import { formatCurrency } from "@/lib/currency";
import { useGetLookupsQuery } from "@/store/api/settingsApi";
import { useSaveCommitteeDecisionMutation } from "@/store/api/procurementsApi";
import { WorkflowStageFields } from "@/components/procurement/workflow-stage-fields";
import type { CustomWorkflowField } from "@/lib/procurement/stage-field-catalog";

type BidAmountLine = {
  currencyId: string | null;
  amount: number;
  forexRate: number | null;
  currencyCode?: string;
};

type Bidder = {
  id: string;
  name: string;
  passedTech?: boolean | null;
};

type Props = {
  procurementId: string;
  costEstimate: number;
  bidders: Bidder[];
  initialDecision?: {
    winnerBidderId?: string | null;
    bidCurrencyId?: string | null;
    paymentConditionId?: string | null;
    bidAmountWithoutVatLines?: BidAmountLine[];
    bidAmountWithVatLines?: BidAmountLine[];
    bidAmountWithVat?: number | null;
    bidAmountWithoutVat?: number | null;
    warrantyDays?: number | null;
    workDays?: Array<{ workDayCategoryId: string; days: number }>;
  };
  submitLabel?: string;
  pgSettings: {
    pgDiscountThresholdPercent: number;
    pgLowDiscountRatePercent: number;
    pgFrontLoadingCostFactor: number;
    pgFrontLoadingRate: number;
  };
  onSaved: () => void;
  workflowCustomFields?: CustomWorkflowField[];
  workflowFieldOrder?: Array<{ fieldRef: string; sortOrder: number }>;
  workflowValues?: Record<string, string>;
  onWorkflowValueChange?: (fieldId: string, value: string) => void;
  onBeforeSave?: () => Promise<void>;
};

function computeDraftTotal(lines: BidAmountLineDraft[], currencies: Array<{ id: string; code: string }>): number {
  let total = 0;
  for (const line of lines) {
    const amount = Number(line.amount);
    if (!amount || amount <= 0) continue;
    const code = currencies.find((c) => c.id === line.currencyId)?.code ?? "";
    if (code === "NPR") {
      total += amount;
      continue;
    }
    const forex = Number(line.forexRate);
    if (!forex || forex <= 0) continue;
    total += amount * forex;
  }
  return Math.round(total * 100) / 100;
}

export function CommitteeDecisionPanel({
  procurementId,
  costEstimate,
  bidders,
  initialDecision,
  submitLabel = "Confirm committee decision",
  pgSettings,
  onSaved,
  workflowCustomFields = [],
  workflowFieldOrder,
  workflowValues = {},
  onWorkflowValueChange,
  onBeforeSave,
}: Props) {
  const passed = bidders.filter((b) => b.passedTech === true);
  const { data: categories } = useGetLookupsQuery("work-day-categories");
  const { data: currencies } = useGetLookupsQuery("currencies");
  const { data: paymentConditions } = useGetLookupsQuery("payment-conditions");
  const [saveDecision, { isLoading }] = useSaveCommitteeDecisionMutation();

  const [winnerId, setWinnerId] = useState("");
  const [bidCurrencyId, setBidCurrencyId] = useState("");
  const [paymentConditionId, setPaymentConditionId] = useState("");
  const [withoutVatLines, setWithoutVatLines] = useState<BidAmountLineDraft[]>([]);
  const [withVatLines, setWithVatLines] = useState<BidAmountLineDraft[]>([]);
  const [warrantyDays, setWarrantyDays] = useState("0");
  const [categoryDays, setCategoryDays] = useState<Record<string, string>>({});

  const sortedCategories = useMemo(
    () =>
      [...((categories as Array<{ id: string; name: string; sortOrder?: number }>) ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [categories],
  );
  const sortedCurrencies = useMemo(
    () =>
      [...((currencies as Array<{ id: string; code: string; symbol: string; sortOrder?: number }>) ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [currencies],
  );
  const sortedPaymentConditions = useMemo(
    () =>
      [
        ...((paymentConditions as Array<{ id: string; name: string; sortOrder?: number }>) ??
          []),
      ].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [paymentConditions],
  );
  const defaultCurrencyId = useMemo(
    () => sortedCurrencies.find((c) => c.code === "NPR")?.id ?? sortedCurrencies[0]?.id ?? "",
    [sortedCurrencies],
  );
  const bidWithoutVatTotal = useMemo(
    () => computeDraftTotal(withoutVatLines, sortedCurrencies),
    [withoutVatLines, sortedCurrencies],
  );

  useEffect(() => {
    if (!winnerId && passed.length === 1) {
      setWinnerId(passed[0]!.id);
    }
  }, [passed, winnerId]);

  useEffect(() => {
    if (!bidCurrencyId && sortedCurrencies.length > 0) {
      const preferred = sortedCurrencies.find((c) => c.code === "NPR") ?? sortedCurrencies[0];
      if (preferred) setBidCurrencyId(preferred.id);
    }
  }, [sortedCurrencies, bidCurrencyId]);

  useEffect(() => {
    if (!paymentConditionId && sortedPaymentConditions.length > 0) {
      setPaymentConditionId(sortedPaymentConditions[0]!.id);
    }
  }, [sortedPaymentConditions, paymentConditionId]);

  useEffect(() => {
    if (!defaultCurrencyId) return;
    if (withoutVatLines.length === 0) {
      setWithoutVatLines([createBidAmountLineDraft(defaultCurrencyId)]);
    }
    if (withVatLines.length === 0) {
      setWithVatLines([createBidAmountLineDraft(defaultCurrencyId)]);
    }
  }, [defaultCurrencyId, withoutVatLines.length, withVatLines.length]);

  useEffect(() => {
    if (!initialDecision || !defaultCurrencyId) return;
    if (initialDecision.winnerBidderId) setWinnerId(initialDecision.winnerBidderId);
    if (initialDecision.bidCurrencyId) setBidCurrencyId(initialDecision.bidCurrencyId);
    if (initialDecision.paymentConditionId) setPaymentConditionId(initialDecision.paymentConditionId);
    if (initialDecision.bidAmountWithoutVatLines?.length) {
      setWithoutVatLines(
        payloadToDraftLines(initialDecision.bidAmountWithoutVatLines, defaultCurrencyId),
      );
    } else if (initialDecision.bidAmountWithoutVat != null) {
      setWithoutVatLines([
        {
          key: crypto.randomUUID(),
          currencyId: defaultCurrencyId,
          amount: String(initialDecision.bidAmountWithoutVat),
          forexRate: "",
        },
      ]);
    }
    if (initialDecision.bidAmountWithVatLines?.length) {
      setWithVatLines(payloadToDraftLines(initialDecision.bidAmountWithVatLines, defaultCurrencyId));
    } else if (initialDecision.bidAmountWithVat != null) {
      setWithVatLines([
        {
          key: crypto.randomUUID(),
          currencyId: defaultCurrencyId,
          amount: String(initialDecision.bidAmountWithVat),
          forexRate: "",
        },
      ]);
    }
    if (initialDecision.warrantyDays != null) setWarrantyDays(String(initialDecision.warrantyDays));
    if (initialDecision.workDays?.length) {
      setCategoryDays(
        Object.fromEntries(
          initialDecision.workDays.map((w) => [w.workDayCategoryId, String(w.days)]),
        ),
      );
    }
  }, [initialDecision, defaultCurrencyId]);

  const pgPreview = useMemo(() => {
    if (!bidWithoutVatTotal || bidWithoutVatTotal <= 0 || !Number.isFinite(costEstimate) || costEstimate <= 0) {
      return null;
    }
    try {
      return calculatePgAmount(
        { costEstimateWithoutVat: costEstimate, bidAmountWithoutVat: bidWithoutVatTotal },
        normalizePgFormulaSettings(pgSettings),
      );
    } catch {
      return null;
    }
  }, [bidWithoutVatTotal, costEstimate, pgSettings]);

  async function submit() {
    if (!winnerId) {
      toast.error("Select the winning bidder");
      return;
    }
    if (!bidCurrencyId) {
      toast.error("Select bid currency");
      return;
    }
    if (!paymentConditionId) {
      toast.error("Select payment condition");
      return;
    }

    const bidAmountWithoutVatLines = draftLinesToPayload(withoutVatLines, sortedCurrencies);
    if (bidAmountWithoutVatLines.length === 0) {
      toast.error("Enter at least one bid amount without VAT");
      return;
    }

    const bidAmountWithVatLines = draftLinesToPayload(withVatLines, sortedCurrencies);

    const workDays = sortedCategories.map((c) => ({
      workDayCategoryId: c.id,
      days: Number(categoryDays[c.id] ?? 0),
    }));
    try {
      if (onBeforeSave) await onBeforeSave();
      await saveDecision({
        id: procurementId,
        winnerBidderId: winnerId,
        bidCurrencyId,
        paymentConditionId,
        bidAmountWithoutVatLines,
        bidAmountWithVatLines,
        warrantyDays: Number(warrantyDays),
        workDays,
      }).unwrap();
      toast.success("Committee decision recorded");
      onSaved();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save committee decision"));
    }
  }

  if (passed.length === 0) {
    return (
      <Card className="mt-6">
        <CardTitle>Evaluation committee</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          No technically passed bidders to evaluate.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="mb-0">
        <div>
          <CardTitle>Evaluation committee decision</CardTitle>
          <CardDescription>
            Select the winning bidder, enter bid amounts in one or more currencies (converted to NPR
            for totals), work day categories, and warranty days. PG amount is calculated from the
            ex-VAT NPR total.
          </CardDescription>
        </div>
      </CardHeader>
      <WorkflowStageFields
        stageKey="committee_decision"
        customFields={workflowCustomFields}
        fieldOrder={workflowFieldOrder}
        values={workflowValues}
        onValueChange={onWorkflowValueChange ?? (() => undefined)}
        className="mt-4 grid gap-4 md:grid-cols-2"
        builtinRenderers={{
          winnerBidderId: (
            <Select
              label="Winning bidder"
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
            >
              <option value="">Select…</option>
              {passed.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          ),
          warrantyDays: (
            <Input
              label="Warranty days"
              type="number"
              min={0}
              value={warrantyDays}
              onChange={(e) => setWarrantyDays(e.target.value)}
            />
          ),
          bidCurrencyId: (
            <Select
              label="Bid currency"
              value={bidCurrencyId}
              onChange={(e) => setBidCurrencyId(e.target.value)}
            >
              <option value="">Select…</option>
              {sortedCurrencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          ),
          paymentConditionId: (
            <Select
              label="Payment condition"
              value={paymentConditionId}
              onChange={(e) => setPaymentConditionId(e.target.value)}
            >
              <option value="">Select…</option>
              {sortedPaymentConditions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          ),
          bidAmountWithoutVat: (
            <BidAmountLinesEditor
              label="Bid amounts without VAT"
              lines={withoutVatLines}
              currencies={sortedCurrencies}
              defaultCurrencyId={defaultCurrencyId}
              onChange={setWithoutVatLines}
            />
          ),
          bidAmountWithVat: (
            <BidAmountLinesEditor
              label="Bid amounts with VAT"
              optional
              lines={withVatLines}
              currencies={sortedCurrencies}
              defaultCurrencyId={defaultCurrencyId}
              onChange={setWithVatLines}
            />
          ),
          workDays: (
            <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map((cat) => (
                <Input
                  key={cat.id}
                  label={cat.name}
                  type="number"
                  min={0}
                  value={categoryDays[cat.id] ?? ""}
                  onChange={(e) =>
                    setCategoryDays((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                />
              ))}
            </div>
          ),
        }}
      />
      {pgPreview ? (
        <p className="mt-4 text-sm text-[var(--color-text-soft)]">
          PG amount (
          {pgPreview.method === "low_discount"
            ? "5% of bid"
            : "5% of bid + front loading"}
          ):{" "}
          <strong className="text-[var(--color-text)]">
            {formatCurrency(pgPreview.pgAmount)}
          </strong>
          {pgPreview.method === "front_loading" ? (
            <span className="text-[var(--color-text-soft)]">
              {" "}
              ({formatCurrency(pgPreview.basePgAmount)} +{" "}
              {formatCurrency(pgPreview.frontLoadingAmount)})
            </span>
          ) : null}
          {" "}
          ({formatBidVsCostEstimateLabel(costEstimate, bidWithoutVatTotal)})
        </p>
      ) : null}
      <Button className="mt-4" disabled={isLoading} onClick={submit}>
        {isLoading ? "Saving…" : submitLabel}
      </Button>
    </Card>
  );
}
