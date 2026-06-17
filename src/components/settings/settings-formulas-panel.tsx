"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/store/api/settingsApi";

type Props = {
  vatPercent: string;
  bsfDefault: string;
  prebidOffset: string;
  onVatChange: (v: string) => void;
  onBsfChange: (v: string) => void;
  onPrebidChange: (v: string) => void;
};

export function SettingsFormulasPanel({
  vatPercent,
  bsfDefault,
  prebidOffset,
  onVatChange,
  onBsfChange,
  onPrebidChange,
}: Props) {
  const { data: settings } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();

  const [loaDelayDays, setLoaDelayDays] = useState("");
  const [pgDiscountThreshold, setPgDiscountThreshold] = useState("");
  const [pgLowDiscountRate, setPgLowDiscountRate] = useState("");
  const [pgFrontLoadingCostFactor, setPgFrontLoadingCostFactor] = useState("");
  const [pgFrontLoadingRate, setPgFrontLoadingRate] = useState("");
  const [pgValidityExtensionDays, setPgValidityExtensionDays] = useState("");

  useEffect(() => {
    if (!settings) return;
    setLoaDelayDays(String(settings.loaDelayDays ?? ""));
    setPgDiscountThreshold(String(settings.pgDiscountThresholdPercent ?? ""));
    setPgLowDiscountRate(String(settings.pgLowDiscountRatePercent ?? ""));
    setPgFrontLoadingCostFactor(String(settings.pgFrontLoadingCostFactor ?? ""));
    setPgFrontLoadingRate(String(settings.pgFrontLoadingRate ?? ""));
    setPgValidityExtensionDays(String(settings.pgValidityExtensionDays ?? ""));
  }, [settings]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Formula &amp; defaults</CardTitle>
          <CardDescription>
            Global percentages and offsets applied when calculating procurement amounts and dates
          </CardDescription>
        </div>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="VAT %"
          type="number"
          step="0.01"
          hint="Added to applicable cost lines"
          value={vatPercent || String(settings?.vatPercent ?? "")}
          onChange={(e) => onVatChange(e.target.value)}
        />
        <Input
          label="BSF default %"
          type="number"
          step="0.01"
          hint="Default bid security fee percentage"
          value={bsfDefault || String(settings?.bsfDefaultPercent ?? "")}
          onChange={(e) => onBsfChange(e.target.value)}
        />
        <Input
          label="Pre-bid offset days"
          type="number"
          hint="Working days before bid open for pre-bid meeting"
          value={prebidOffset || String(settings?.prebidOffsetDays ?? "")}
          onChange={(e) => onPrebidChange(e.target.value)}
        />
        <Input
          label="LOA delay (working days)"
          type="number"
          hint="Working days after LOI before LOA is issued"
          value={loaDelayDays}
          onChange={(e) => setLoaDelayDays(e.target.value)}
        />
        <Input
          label="PG discount threshold %"
          type="number"
          step="0.01"
          hint="At or above this discount, front-loading formula applies"
          value={pgDiscountThreshold}
          onChange={(e) => setPgDiscountThreshold(e.target.value)}
        />
        <Input
          label="PG rate when below threshold %"
          type="number"
          step="0.01"
          hint="Applied to bid amount (ex-VAT) when discount is below threshold"
          value={pgLowDiscountRate}
          onChange={(e) => setPgLowDiscountRate(e.target.value)}
        />
        <Input
          label="Front-loading cost factor"
          type="number"
          step="0.01"
          hint="Multiplier on cost estimate in front-loading formula (default 0.85)"
          value={pgFrontLoadingCostFactor}
          onChange={(e) => setPgFrontLoadingCostFactor(e.target.value)}
        />
        <Input
          label="Front-loading rate"
          type="number"
          step="0.01"
          hint="Multiplier on (factor × cost − bid) (default 0.5)"
          value={pgFrontLoadingRate}
          onChange={(e) => setPgFrontLoadingRate(e.target.value)}
        />
        <Input
          label="PG validity extension days"
          type="number"
          hint="Added to work days + warranty when calculating PG validity date"
          value={pgValidityExtensionDays}
          onChange={(e) => setPgValidityExtensionDays(e.target.value)}
        />
      </div>
      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={async () => {
          await updateSettings({
            vatPercent: Number(vatPercent || settings?.vatPercent),
            bsfDefaultPercent: Number(bsfDefault || settings?.bsfDefaultPercent),
            prebidOffsetDays: Number(prebidOffset || settings?.prebidOffsetDays),
            loaDelayDays: Number(loaDelayDays || settings?.loaDelayDays),
            pgDiscountThresholdPercent: Number(
              pgDiscountThreshold || settings?.pgDiscountThresholdPercent,
            ),
            pgLowDiscountRatePercent: Number(pgLowDiscountRate || settings?.pgLowDiscountRatePercent),
            pgFrontLoadingCostFactor: Number(
              pgFrontLoadingCostFactor || settings?.pgFrontLoadingCostFactor,
            ),
            pgFrontLoadingRate: Number(pgFrontLoadingRate || settings?.pgFrontLoadingRate),
            pgValidityExtensionDays: Number(
              pgValidityExtensionDays || settings?.pgValidityExtensionDays,
            ),
          });
          toast.success("Settings saved");
        }}
      >
        <Calculator className="h-4 w-4" />
        Save settings
      </Button>
    </Card>
  );
}
