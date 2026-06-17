"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bell, CalendarClock, ChevronDown, ChevronUp, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/loading-state";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MILESTONE_CATALOG } from "@/lib/reminders/milestones";
import { useGetRemindersQuery, useUpdateRemindersMutation } from "@/store/api/settingsApi";
import { hasPermission } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";

type ReminderRow = {
  id: string;
  milestoneKey: string;
  label: string;
  enabled: boolean;
  upcomingDays: number;
  almostDueDays: number;
  criticalDays: number;
  remindDaysBefore: number[];
  repeatEveryDays: number;
  notifyInApp: boolean;
  sendEmail: boolean;
  offsetWorkingDays: number | null;
  sortOrder: number;
};

const MILESTONE_GROUPS: Array<{ title: string; description: string; keys: string[] }> = [
  {
    title: "Pre-bid & bid opening",
    description: "Reminders before pre-bid meeting, bid fee deadline, and public bid opening",
    keys: ["prebidDate", "bidFeeSubmissionDate", "bidOpenDate"],
  },
  {
    title: "Financial evaluation & contract",
    description: "Price bid opening, LOA after LOI, and bid validity",
    keys: ["priceBidOpenDate", "loaDueAfterLoi", "bidValidityDate"],
  },
  {
    title: "Work execution",
    description: "Scheduled work initiation and completion dates",
    keys: ["scheduledInitiationDate", "scheduledCompletionDate"],
  },
];

function parseDaysList(value: string): number[] {
  return [
    ...new Set(
      value
        .split(/[,;\s]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0),
    ),
  ].sort((a, b) => b - a);
}

function ReminderRuleEditor({
  row,
  catalogDescription,
  canManage,
  expanded,
  onToggleExpand,
  onChange,
}: {
  row: ReminderRow;
  catalogDescription?: string;
  canManage: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<ReminderRow>) => void;
}) {
  return (
    <div
      className={`rounded-xl border transition ${
        row.enabled
          ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
          : "border-[var(--color-border)] bg-[var(--color-surface-strong)]/20"
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <label className="mt-0.5 flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={row.enabled}
              disabled={!canManage}
              onChange={(e) => onChange({ enabled: e.target.checked })}
              className="h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              aria-label={`Enable reminders for ${row.label}`}
            />
          </label>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-display text-base font-bold text-[var(--color-text)]">
                {row.label}
              </h4>
              {row.enabled ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="default">Off</Badge>
              )}
              {row.milestoneKey === "loaDueAfterLoi" && (
                <Badge tone="primary">Computed from LOI date</Badge>
              )}
            </div>
            {catalogDescription && (
              <p className="mt-1 text-sm text-[var(--color-text-soft)]">{catalogDescription}</p>
            )}
            <p className="mt-2 text-xs text-[var(--color-text-soft)]">
              Remind at{" "}
              <span className="font-semibold text-[var(--color-text)]">
                {(row.remindDaysBefore ?? []).join(", ") || "—"}
              </span>{" "}
              day(s) before
              {row.repeatEveryDays > 0 && (
                <>
                  {" "}
                  · repeat every <span className="font-semibold">{row.repeatEveryDays}</span> day(s)
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="shrink-0 self-start sm:self-center"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide timing
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Configure timing
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-4">
          <p className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            When and how often to remind
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Input
              label="Days before target date"
              hint="Comma-separated, e.g. 14, 7, 3, 1, 0"
              value={(row.remindDaysBefore ?? []).join(", ")}
              disabled={!canManage}
              onChange={(e) => onChange({ remindDaysBefore: parseDaysList(e.target.value) })}
            />
            <Input
              label="Repeat every (days)"
              hint="0 = only on days listed above"
              type="number"
              min={0}
              disabled={!canManage}
              value={row.repeatEveryDays}
              onChange={(e) => onChange({ repeatEveryDays: Number(e.target.value) || 0 })}
            />
            <Input
              label="Upcoming severity (days)"
              type="number"
              min={0}
              disabled={!canManage}
              value={row.upcomingDays}
              onChange={(e) => onChange({ upcomingDays: Number(e.target.value) || 0 })}
            />
            <Input
              label="Almost due (days)"
              type="number"
              min={0}
              disabled={!canManage}
              value={row.almostDueDays}
              onChange={(e) => onChange({ almostDueDays: Number(e.target.value) || 0 })}
            />
            <Input
              label="Critical (days)"
              type="number"
              min={0}
              disabled={!canManage}
              value={row.criticalDays}
              onChange={(e) => onChange({ criticalDays: Number(e.target.value) || 0 })}
            />
            {row.milestoneKey === "loaDueAfterLoi" && (
              <Input
                label="LOA due offset (working days)"
                hint="Leave blank to use LOA delay in Formulas tab"
                type="number"
                min={0}
                disabled={!canManage}
                value={row.offsetWorkingDays ?? ""}
                onChange={(e) =>
                  onChange({
                    offsetWorkingDays: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            )}
            <Select
              label="In-app notifications"
              disabled={!canManage}
              value={row.notifyInApp ? "yes" : "no"}
              onChange={(e) => onChange({ notifyInApp: e.target.value === "yes" })}
            >
              <option value="yes">Send in-app</option>
              <option value="no">Do not send</option>
            </Select>
            <Select
              label="Email reminders"
              disabled={!canManage}
              value={row.sendEmail ? "yes" : "no"}
              onChange={(e) => onChange({ sendEmail: e.target.value === "yes" })}
            >
              <option value="yes">Send email</option>
              <option value="no">Do not send</option>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-soft)]">
            <span className="inline-flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" />
              In-app: {row.notifyInApp ? "on" : "off"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              Email: {row.sendEmail ? "on" : "off"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsRemindersPanel() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = hasPermission(user, "settings.manage");
  const { data: reminders, isLoading, isError, refetch } = useGetRemindersQuery();
  const [updateReminders, { isLoading: saving }] = useUpdateRemindersMutation();
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (reminders) {
      setRows(reminders as ReminderRow[]);
    }
  }, [reminders]);

  const catalogByKey = useMemo(
    () => Object.fromEntries(MILESTONE_CATALOG.map((m) => [m.milestoneKey, m])),
    [],
  );

  const rowsByKey = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.milestoneKey, r])),
    [rows],
  );

  const enabledCount = rows.filter((r) => r.enabled).length;

  function updateRow(id: string, patch: Partial<ReminderRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function enableAllInGroup(keys: string[], enabled: boolean) {
    if (!canManage) return;
    setRows((prev) =>
      prev.map((r) => (keys.includes(r.milestoneKey) ? { ...r, enabled } : r)),
    );
  }

  async function handleSave() {
    if (!canManage) {
      toast.error("You need manage settings permission to save");
      return;
    }
    try {
      await updateReminders(rows as unknown[]).unwrap();
      toast.success("Reminder settings saved");
    } catch {
      toast.error("Failed to save reminders");
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading reminder configuration…" />;
  }

  if (isError) {
    return (
      <Card>
        <EmptyState
          title="Could not load reminder settings"
          description="Check that database migrations have been applied, then try again."
          action={
            <Button type="button" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="page-stack">
      <Card className="border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent">
        <CardHeader className="mb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Notification &amp; reminder dates</CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  Choose which procurement dates should trigger reminders. For each date, set how
                  many days before the target you want to be notified, how often to repeat, and
                  whether to send in-app alerts and emails. Configure SMTP under the SMTP tab for
                  email delivery.
                </CardDescription>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                  {enabledCount} of {rows.length} reminder date{rows.length === 1 ? "" : "s"}{" "}
                  enabled
                </p>
              </div>
            </div>
            {canManage && (
              <Button onClick={handleSave} disabled={saving}>
                <Bell className="h-4 w-4" />
                {saving ? "Saving…" : "Save all changes"}
              </Button>
            )}
          </div>
        </CardHeader>
        {!canManage && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            You can view reminder settings but need <strong>Manage Settings</strong> permission to
            change them.
          </p>
        )}
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No reminder rules found"
            description="Rules are created automatically from the milestone catalog. Try refreshing the page."
            action={
              <Button type="button" onClick={() => refetch()}>
                Refresh
              </Button>
            }
          />
        </Card>
      ) : (
        MILESTONE_GROUPS.map((group) => {
          const groupRows = group.keys
            .map((key) => rowsByKey[key])
            .filter((r): r is ReminderRow => Boolean(r));
          if (!groupRows.length) return null;
          const groupEnabled = groupRows.filter((r) => r.enabled).length;

          return (
            <Card key={group.title}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                    <p className="mt-1 text-xs font-medium text-[var(--color-text-soft)]">
                      {groupEnabled} of {groupRows.length} enabled in this group
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => enableAllInGroup(group.keys, true)}
                      >
                        Enable all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => enableAllInGroup(group.keys, false)}
                      >
                        Disable all
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <div className="space-y-3">
                {groupRows.map((row) => (
                  <ReminderRuleEditor
                    key={row.id}
                    row={row}
                    catalogDescription={catalogByKey[row.milestoneKey]?.description}
                    canManage={canManage}
                    expanded={expandedId === row.id}
                    onToggleExpand={() =>
                      setExpandedId((id) => (id === row.id ? null : row.id))
                    }
                    onChange={(patch) => updateRow(row.id, patch)}
                  />
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
