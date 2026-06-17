"use client";

import { useState } from "react";
import { TabButton, TabList } from "@/components/ui/tabs";
import { LetterTemplatesSettings } from "@/components/settings/letter-templates-settings";
import { NoticeTemplatesSettings } from "@/components/settings/notice-templates-settings";

const subTabs = [
  { id: "notice", label: "Notice" },
  { id: "letters", label: "LOI & letters" },
] as const;

export function DocumentTemplatesSettings() {
  const [subTab, setSubTab] = useState<(typeof subTabs)[number]["id"]>("notice");

  return (
    <div>
      <TabList className="mb-6 max-w-md">
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
      {subTab === "notice" ? <NoticeTemplatesSettings /> : <LetterTemplatesSettings />}
    </div>
  );
}
