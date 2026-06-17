"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/store/api/settingsApi";

type PersonRow = {
  name: string;
  designation: string;
};

function emptyRow(): PersonRow {
  return { name: "", designation: "" };
}

function normalizeRows(value: unknown): PersonRow[] {
  if (!Array.isArray(value)) return [emptyRow()];
  const rows = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { name?: unknown; designation?: unknown };
      return {
        name: String(row.name ?? ""),
        designation: String(row.designation ?? ""),
      };
    })
    .filter((row): row is PersonRow => Boolean(row));
  return rows.length > 0 ? rows : [emptyRow()];
}

function cleanRows(rows: PersonRow[]): PersonRow[] {
  return rows
    .map((row) => ({ name: row.name.trim(), designation: row.designation.trim() }))
    .filter((row) => row.name && row.designation);
}

export function SettingsAuthoritiesWitnessesPanel() {
  const { data: settings } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const [witnesses, setWitnesses] = useState<PersonRow[]>([emptyRow()]);
  const [authorities, setAuthorities] = useState<PersonRow[]>([emptyRow()]);

  useEffect(() => {
    if (!settings) return;
    setWitnesses(normalizeRows(settings.departmentWitnesses));
    setAuthorities(normalizeRows(settings.departmentSigningAuthorities));
  }, [settings]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Authorities & witnesses</CardTitle>
          <CardDescription>
            Configure multiple department witnesses and signing authorities for contract templates.
          </CardDescription>
        </div>
      </CardHeader>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Department witnesses</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWitnesses((prev) => [...prev, emptyRow()])}
            >
              Add witness
            </Button>
          </div>
          {witnesses.map((row, idx) => (
            <div key={`w-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                label={idx === 0 ? "Name" : undefined}
                value={row.name}
                onChange={(e) =>
                  setWitnesses((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <Input
                label={idx === 0 ? "Designation" : undefined}
                value={row.designation}
                onChange={(e) =>
                  setWitnesses((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, designation: e.target.value } : r)),
                  )
                }
              />
              <Button
                className="self-end"
                variant="danger"
                size="sm"
                disabled={witnesses.length === 1}
                onClick={() =>
                  setWitnesses((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              Department signing authorities
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAuthorities((prev) => [...prev, emptyRow()])}
            >
              Add authority
            </Button>
          </div>
          {authorities.map((row, idx) => (
            <div key={`a-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                label={idx === 0 ? "Name" : undefined}
                value={row.name}
                onChange={(e) =>
                  setAuthorities((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <Input
                label={idx === 0 ? "Designation" : undefined}
                value={row.designation}
                onChange={(e) =>
                  setAuthorities((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, designation: e.target.value } : r)),
                  )
                }
              />
              <Button
                className="self-end"
                variant="danger"
                size="sm"
                disabled={authorities.length === 1}
                onClick={() =>
                  setAuthorities((prev) =>
                    prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
                  )
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button
        className="mt-6 w-full sm:w-auto"
        onClick={async () => {
          try {
            const payload = {
              departmentWitnesses: cleanRows(witnesses),
              departmentSigningAuthorities: cleanRows(authorities),
            };
            await updateSettings(payload).unwrap();
            toast.success("Authorities and witnesses saved");
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save authorities and witnesses"));
          }
        }}
      >
        <Save className="h-4 w-4" />
        Save authorities & witnesses
      </Button>
    </Card>
  );
}
