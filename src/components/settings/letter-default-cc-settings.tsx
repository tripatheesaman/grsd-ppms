"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/store/api/settingsApi";

function linesToText(lines: string[]): string {
  return lines.join("\n");
}

function textToLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function LetterDefaultCcSettings() {
  const { data: settings } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const [ccText, setCcText] = useState("");

  useEffect(() => {
    const lines = (settings?.letterDefaultCcLines as string[] | undefined) ?? [];
    setCcText(linesToText(lines));
  }, [settings?.letterDefaultCcLines]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Default CC recipients</CardTitle>
          <CardDescription>
            These recipients are inserted inside{" "}
            <code className="text-[var(--color-primary)]">{`{{cc_block}}`}</code> immediately
            after <strong>CC:</strong> and before other bidders. Use only{" "}
            <code className="text-[var(--color-primary)]">{`{{cc_block}}`}</code> in your
            template (do not add a separate default CC placeholder). One recipient per line,
            entered exactly as it should appear in the letter.
          </CardDescription>
        </div>
      </CardHeader>
      <Textarea
        label="CC recipients"
        hint='Example: "Procurement Unit, GRSD, TIA" or "Finance Department, Kathmandu"'
        rows={6}
        value={ccText}
        onChange={(e) => setCcText(e.target.value)}
        placeholder={"Procurement Section, GRSD\nFinance Committee, TIA Kathmandu"}
        className="font-mono text-sm"
      />
      <Button
        className="mt-4 w-full sm:w-auto"
        onClick={async () => {
          try {
            const result = await updateSettings({
              letterDefaultCcLines: textToLines(ccText),
            }).unwrap();
            const saved = (result.letterDefaultCcLines as string[] | undefined) ?? [];
            setCcText(linesToText(saved));
            toast.success("Default CC recipients saved");
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save default CC recipients"));
          }
        }}
      >
        <Save className="h-4 w-4" />
        Save default CC
      </Button>
    </Card>
  );
}
