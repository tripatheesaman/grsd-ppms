"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentTemplatesSettings } from "@/components/settings/document-templates-settings";
import { SettingsAuthoritiesWitnessesPanel } from "@/components/settings/settings-authorities-witnesses-panel";
import { SettingsCalendarPanel } from "@/components/settings/settings-calendar-panel";
import { SettingsFormulasPanel } from "@/components/settings/settings-formulas-panel";
import { SettingsLookupsPanel } from "@/components/settings/settings-lookups-panel";
import { SettingsRemindersPanel } from "@/components/settings/settings-reminders-panel";
import { SettingsWorkflowFieldsPanel } from "@/components/settings/settings-workflow-fields-panel";
import { SettingsSmtpPanel } from "@/components/settings/settings-smtp-panel";
import { TabButton, TabList } from "@/components/ui/tabs";
import { useGetHolidaysQuery, useGetSettingsQuery } from "@/store/api/settingsApi";
import { todayBsYearMonth } from "@/lib/calendar/bs-calendar";

const settingsTabs = [
  { id: "formulas", label: "Formulas" },
  { id: "authorities", label: "Authorities" },
  { id: "lookups", label: "Lookups" },
  { id: "calendar", label: "Calendar" },
  { id: "workflow-fields", label: "Workflow fields" },
  { id: "reminders", label: "Notifications" },
  { id: "smtp", label: "SMTP" },
  { id: "templates", label: "Templates" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: settings } = useGetSettingsQuery();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return settingsTabs.some((t) => t.id === tab) ? tab! : "formulas";
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && settingsTabs.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  function selectTab(tabId: (typeof settingsTabs)[number]["id"]) {
    setActiveTab(tabId);
    router.replace(`/settings?tab=${tabId}`, { scroll: false });
  }

  const initialBs = todayBsYearMonth();
  const [calendarBsYear, setCalendarBsYear] = useState(initialBs.year);
  const [calendarBsMonth, setCalendarBsMonth] = useState(initialBs.month);
  const { data: holidays, refetch: refetchHolidays } = useGetHolidaysQuery({
    bsYear: calendarBsYear,
    bsMonth: calendarBsMonth,
  });
  const [selectedHolidayDays, setSelectedHolidayDays] = useState<number[]>([]);

  const [weeklyOffForm, setWeeklyOffForm] = useState({
    dayFrom: 1,
    dayTo: 31,
    offDays: [0, 6] as number[],
  });
  const [vatPercent, setVatPercent] = useState("");
  const [bsfDefault, setBsfDefault] = useState("");
  const [prebidOffset, setPrebidOffset] = useState("");
  const [defaultOffDays, setDefaultOffDays] = useState<number[]>([0, 6]);

  useEffect(() => {
    if (settings) {
      setVatPercent(String(settings.vatPercent ?? ""));
      setBsfDefault(String(settings.bsfDefaultPercent ?? ""));
      setPrebidOffset(String(settings.prebidOffsetDays ?? ""));
      setDefaultOffDays((settings.weeklyDefaultOffDays as number[]) ?? [0, 6]);
    }
  }, [settings]);

  useEffect(() => {
    const days =
      (holidays as Array<{ bsDay?: number; day?: number }> | undefined)?.map((h) =>
        Number(h.bsDay ?? h.day),
      ) ?? [];
    setSelectedHolidayDays(days);
  }, [holidays]);

  return (
    <AppShell title="Settings">
      <TabList className="mb-6">
        {settingsTabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
          >
            {tab.id === "reminders" ? (
              <span className="inline-flex items-center gap-1.5">
                <Bell className="h-4 w-4" />
                {tab.label}
              </span>
            ) : (
              tab.label
            )}
          </TabButton>
        ))}
      </TabList>

      {activeTab === "formulas" && (
        <SettingsFormulasPanel
          vatPercent={vatPercent}
          bsfDefault={bsfDefault}
          prebidOffset={prebidOffset}
          onVatChange={setVatPercent}
          onBsfChange={setBsfDefault}
          onPrebidChange={setPrebidOffset}
        />
      )}

      {activeTab === "authorities" && <SettingsAuthoritiesWitnessesPanel />}

      {activeTab === "lookups" && <SettingsLookupsPanel />}

      {activeTab === "calendar" && (
        <SettingsCalendarPanel
          calendarBsYear={calendarBsYear}
          calendarBsMonth={calendarBsMonth}
          selectedHolidayDays={selectedHolidayDays}
          onHolidayDaysChange={setSelectedHolidayDays}
          onMonthChange={(bsYear, bsMonth) => {
            setCalendarBsYear(bsYear);
            setCalendarBsMonth(bsMonth);
          }}
          defaultOffDays={defaultOffDays}
          onDefaultOffDaysChange={setDefaultOffDays}
          weeklyOffForm={weeklyOffForm}
          onWeeklyOffFormChange={setWeeklyOffForm}
          onHolidaysSaved={() => refetchHolidays()}
          onWeeklyOffChanged={() => {}}
        />
      )}

      {activeTab === "workflow-fields" && <SettingsWorkflowFieldsPanel />}

      {activeTab === "reminders" && <SettingsRemindersPanel />}

      {activeTab === "smtp" && <SettingsSmtpPanel />}

      {activeTab === "templates" && <DocumentTemplatesSettings />}
    </AppShell>
  );
}
