"use client";

import { useState } from "react";
import { TabButton, TabList } from "@/components/ui/tabs";
import { LetterTemplatesSettings } from "@/components/settings/letter-templates-settings";
import { NoticeTemplatesSettings } from "@/components/settings/notice-templates-settings";
import { SettingsStageTemplatesPanel } from "@/components/settings/settings-stage-templates-panel";

const subTabs = [
  { id: "by-stage", label: "By workflow stage" },
  { id: "notice", label: "Notice" },
  { id: "letters", label: "LOI & letters" },
] as const;

export function DocumentTemplatesSettings() {
  const [subTab, setSubTab] = useState<(typeof subTabs)[number]["id"]>("by-stage");

  return (
    <div>
      <TabList className="mb-6 max-w-2xl">
        {subTabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabList>
      {subTab === "by-stage" && <SettingsStageTemplatesPanel />}
      {subTab === "notice" && <NoticeTemplatesSettings />}
      {subTab === "letters" && <LetterTemplatesSettings />}
    </div>
  );
}
