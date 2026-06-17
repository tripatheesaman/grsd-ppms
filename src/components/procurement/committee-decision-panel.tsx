"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { calculatePgAmount, formatBidVsCostEstimateLabel, normalizePgFormulaSettings } from "@/lib/formulas/pg-calculator";
import { formatCurrency } from "@/lib/currency";
import { useGetLookupsQuery } from "@/store/api/settingsApi";
import { useSaveCommitteeDecisionMutation } from "@/store/api/procurementsApi";
import { WorkflowStageFields } from "@/components/procurement/workflow-stage-fields";
import type { CustomWorkflowField } from "@/lib/procurement/stage-field-catalog";

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
  workflowValues?: Record<string, string>;
  onWorkflowValueChange?: (fieldId: string, value: string) => void;
  onBeforeSave?: () => Promise<void>;
};

export function CommitteeDecisionPanel({
  procurementId,
  costEstimate,
  bidders,
  initialDecision,
  submitLabel = "Confirm committee decision",
  pgSettings,
  onSaved,
  workflowCustomFields = [],
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
  const [bidWithVat, setBidWithVat] = useState("");
  const [bidWithoutVat, setBidWithoutVat] = useState("");
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
  const selectedCurrencyCode = useMemo(
    () => sortedCurrencies.find((c) => c.id === bidCurrencyId)?.code ?? null,
    [sortedCurrencies, bidCurrencyId],
  );

  useEffect(() => {
    if (!winnerId && passed.length === 1) {
      setWinnerId(passed[0]!.id);
    }
  }, [passed, winnerId]);

  useEffect(() => {
    if (!bidCurrencyId && sortedCurrencies.length > 0) {
      const preferred =
        sortedCurrencies.find((c) => c.code === "NPR") ?? sortedCurrencies[0];
      if (preferred) setBidCurrencyId(preferred.id);
    }
  }, [sortedCurrencies, bidCurrencyId]);

  useEffect(() => {
    if (!paymentConditionId && sortedPaymentConditions.length > 0) {
      setPaymentConditionId(sortedPaymentConditions[0]!.id);
    }
  }, [sortedPaymentConditions, paymentConditionId]);

  useEffect(() => {
    if (!initialDecision) return;
    if (initialDecision.winnerBidderId) setWinnerId(initialDecision.winnerBidderId);
    if (initialDecision.bidCurrencyId) setBidCurrencyId(initialDecision.bidCurrencyId);
    if (initialDecision.paymentConditionId) setPaymentConditionId(initialDecision.paymentConditionId);
    if (initialDecision.bidAmountWithVat != null) setBidWithVat(String(initialDecision.bidAmountWithVat));
    if (initialDecision.bidAmountWithoutVat != null) setBidWithoutVat(String(initialDecision.bidAmountWithoutVat));
    if (initialDecision.warrantyDays != null) setWarrantyDays(String(initialDecision.warrantyDays));
    if (initialDecision.workDays?.length) {
      setCategoryDays(
        Object.fromEntries(
          initialDecision.workDays.map((w) => [w.workDayCategoryId, String(w.days)]),
        ),
      );
    }
  }, [initialDecision]);

  const pgPreview = useMemo(() => {
    const bid = Number(bidWithoutVat);
    if (!bid || bid <= 0 || !Number.isFinite(costEstimate) || costEstimate <= 0) return null;
    try {
      return calculatePgAmount(
        { costEstimateWithoutVat: costEstimate, bidAmountWithoutVat: bid },
        normalizePgFormulaSettings(pgSettings),
      );
    } catch {
      return null;
    }
  }, [bidWithoutVat, costEstimate, pgSettings]);

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
        bidAmountWithVat: Number(bidWithVat),
        bidAmountWithoutVat: Number(bidWithoutVat),
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
            Select the winning bidder, enter bid amounts, work day categories, and warranty days.
            PG amount is calculated automatically.
          </CardDescription>
        </div>
      </CardHeader>
      <WorkflowStageFields
        stageKey="committee_decision"
        customFields={workflowCustomFields}
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
            <Input
              label="Bid amount without VAT"
              type="number"
              step="0.01"
              min="0.01"
              value={bidWithoutVat}
              onChange={(e) => setBidWithoutVat(e.target.value)}
            />
          ),
          bidAmountWithVat: (
            <Input
              label="Bid amount with VAT"
              type="number"
              step="0.01"
              min="0.01"
              value={bidWithVat}
              onChange={(e) => setBidWithVat(e.target.value)}
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
            {formatCurrency(pgPreview.pgAmount, { currencyCode: selectedCurrencyCode })}
          </strong>
          {pgPreview.method === "front_loading" ? (
            <span className="text-[var(--color-text-soft)]">
              {" "}
              ({formatCurrency(pgPreview.basePgAmount, { currencyCode: selectedCurrencyCode })} +{" "}
              {formatCurrency(pgPreview.frontLoadingAmount, { currencyCode: selectedCurrencyCode })})
            </span>
          ) : null}
          {" "}
          ({formatBidVsCostEstimateLabel(costEstimate, Number(bidWithoutVat))})
        </p>
      ) : null}
      <Button className="mt-4" disabled={isLoading} onClick={submit}>
        {isLoading ? "Saving…" : submitLabel}
      </Button>
    </Card>
  );
}
