"use client";

import toast from "react-hot-toast";
import { CalendarDays, Save } from "lucide-react";
import { MonthHolidayCalendar } from "@/components/settings/month-holiday-calendar";
import { DayOfWeekPicker } from "@/components/settings/day-of-week-picker";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useCreateWeeklyOffMutation,
  useDeleteWeeklyOffMutation,
  useGetWeeklyOffQuery,
  useSaveMonthHolidaysMutation,
  useUpdateSettingsMutation,
} from "@/store/api/settingsApi";
import { bsDayToAdParts, bsMonthAdRange } from "@/lib/calendar/bs-calendar";
import { formatAdDate, formatBsMonthYear } from "@/lib/dates/display";

type Props = {
  calendarBsYear: number;
  calendarBsMonth: number;
  selectedHolidayDays: number[];
  onHolidayDaysChange: (days: number[]) => void;
  onMonthChange: (bsYear: number, bsMonth: number) => void;
  defaultOffDays: number[];
  onDefaultOffDaysChange: (days: number[]) => void;
  weeklyOffForm: { dayFrom: number; dayTo: number; offDays: number[] };
  onWeeklyOffFormChange: (form: {
    dayFrom: number;
    dayTo: number;
    offDays: number[];
  }) => void;
  onHolidaysSaved: () => void;
  onWeeklyOffChanged: () => void;
};

export function SettingsCalendarPanel({
  calendarBsYear,
  calendarBsMonth,
  selectedHolidayDays,
  onHolidayDaysChange,
  onMonthChange,
  defaultOffDays,
  onDefaultOffDaysChange,
  weeklyOffForm,
  onWeeklyOffFormChange,
  onHolidaysSaved,
  onWeeklyOffChanged,
}: Props) {
  const [saveMonthHolidays] = useSaveMonthHolidaysMutation();
  const [updateSettings] = useUpdateSettingsMutation();
  const [createWeeklyOff] = useCreateWeeklyOffMutation();
  const [deleteWeeklyOff] = useDeleteWeeklyOffMutation();
  const adMonthStart = bsDayToAdParts(calendarBsYear, calendarBsMonth, 1);
  const { data: weeklyOff, refetch: refetchWeeklyOff } = useGetWeeklyOffQuery({
    year: adMonthStart.year,
    month: adMonthStart.month,
  });

  const monthLabel = formatBsMonthYear(calendarBsYear, calendarBsMonth);
  const { start, end } = bsMonthAdRange(calendarBsYear, calendarBsMonth);
  const adRangeLabel = `${formatAdDate(start)} – ${formatAdDate(end)}`;
  const weeklyRows = (weeklyOff as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Public holidays</CardTitle>
              <CardDescription>
                Navigate by Nepali (BS) month. Select public holidays by BS day; English (AD) day
                numbers are shown below each cell.
              </CardDescription>
            </div>
            <Badge tone="primary" className="shrink-0">
              {monthLabel} · {selectedHolidayDays.length} selected
            </Badge>
          </div>
        </CardHeader>
        <div className="mx-auto w-full max-w-3xl">
          <MonthHolidayCalendar
            bsYear={calendarBsYear}
            bsMonth={calendarBsMonth}
            selectedDays={selectedHolidayDays}
            onToggleDay={(day) =>
              onHolidayDaysChange(
                selectedHolidayDays.includes(day)
                  ? selectedHolidayDays.filter((d) => d !== day)
                  : [...selectedHolidayDays, day].sort((a, b) => a - b),
              )
            }
            onMonthChange={onMonthChange}
          />
        </div>
        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={async () => {
            await saveMonthHolidays({
              bsYear: calendarBsYear,
              bsMonth: calendarBsMonth,
              days: selectedHolidayDays,
            });
            toast.success("Holidays saved for this month");
            onHolidaysSaved();
          }}
        >
          <Save className="h-4 w-4" />
          Save holidays for {monthLabel}
        </Button>
        <p className="mt-2 text-xs text-[var(--color-text-soft)]">AD equivalent: {adRangeLabel}</p>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Default weekly off</CardTitle>
            <CardDescription>
              Applies to all months unless overridden by a custom range below
            </CardDescription>
          </div>
        </CardHeader>
        <DayOfWeekPicker
          selected={defaultOffDays}
          onChange={onDefaultOffDaysChange}
          label="Off days each week"
        />
        <Button
          className="mt-5 w-full sm:w-auto"
          variant="secondary"
          onClick={async () => {
            await updateSettings({ weeklyDefaultOffDays: defaultOffDays });
            toast.success("Default weekly off saved");
          }}
        >
          Save default
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Custom weekly off</CardTitle>
            <CardDescription>
              Override default off days for part of <strong>{monthLabel}</strong> ({adRangeLabel}).
              Day numbers refer to the English month that contains the start of this BS month.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="From day of month"
            type="number"
            min={1}
            max={31}
            value={String(weeklyOffForm.dayFrom)}
            onChange={(e) =>
              onWeeklyOffFormChange({
                ...weeklyOffForm,
                dayFrom: Number(e.target.value),
              })
            }
          />
          <Input
            label="To day of month"
            type="number"
            min={1}
            max={31}
            value={String(weeklyOffForm.dayTo)}
            onChange={(e) =>
              onWeeklyOffFormChange({
                ...weeklyOffForm,
                dayTo: Number(e.target.value),
              })
            }
          />
        </div>

        <div className="mt-4">
          <DayOfWeekPicker
            selected={weeklyOffForm.offDays}
            onChange={(offDays) => onWeeklyOffFormChange({ ...weeklyOffForm, offDays })}
            label="Off days in this range"
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            className="w-full sm:w-auto"
            onClick={async () => {
              if (!weeklyOffForm.offDays.length) {
                toast.error("Select at least one off day");
                return;
              }
              await createWeeklyOff({
                ...weeklyOffForm,
                year: adMonthStart.year,
                month: adMonthStart.month,
              });
              toast.success("Weekly off rule added");
              refetchWeeklyOff();
              onWeeklyOffChanged();
            }}
          >
            <CalendarDays className="h-4 w-4" />
            Add range
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="danger"
            onClick={async () => {
              for (const row of weeklyRows) {
                await deleteWeeklyOff(String(row.id));
              }
              toast.success("Using default weekly off for this month");
              refetchWeeklyOff();
              onWeeklyOffChanged();
            }}
          >
            Clear custom rules
          </Button>
        </div>

        {weeklyRows.length > 0 && (
          <ul className="mt-6 space-y-2">
            {weeklyRows.map((r) => (
              <li
                key={String(r.id)}
                className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-[var(--color-text)]">
                  Days {String(r.dayFrom)}–{String(r.dayTo)} · off:{" "}
                  {Array.isArray(r.offDays)
                    ? (r.offDays as number[])
                        .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                        .join(", ")
                    : String(r.offDays)}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    await deleteWeeklyOff(String(r.id));
                    toast.success("Rule removed");
                    refetchWeeklyOff();
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
