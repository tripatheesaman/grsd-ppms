"use client";

import { BidTypeTemplateSettings } from "@/components/settings/bid-type-template-settings";
import { LetterDefaultCcSettings } from "@/components/settings/letter-default-cc-settings";
import { GlobalDocumentTemplateSettings } from "@/components/settings/global-document-template-settings";
import { PlaceholderGuideDownload } from "@/components/settings/placeholder-guide-download";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GLOBAL_LETTER_TEMPLATES = [
  {
    type: "LOI_WINNER",
    title: "Winner LOI",
    description: "Used when generating the winner LOI letter (loi-winner) for the selected winning bidder.",
    defaultName: "Winner LOI template",
    uploadLabel: "winner LOI template",
  },
  {
    type: "LOA",
    title: "Letter of acceptance (LOA)",
    description: "Used when generating the letter of acceptance (loa) for the contract award.",
    defaultName: "LOA template",
    uploadLabel: "LOA template",
  },
  {
    type: "CONTRACT",
    title: "Contract agreement",
    description: "Used when generating the contract document after LOA is issued.",
    defaultName: "Contract template",
    uploadLabel: "contract template",
  },
] as const;

export function LetterTemplatesSettings() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>LOI &amp; letter templates</CardTitle>
            <CardDescription>
              Technical-pass LOI and rejection templates are configured per bid type (like notices).
              Winner LOI and LOA use a single global template.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="mt-4">
          <PlaceholderGuideDownload />
        </div>
      </Card>

      <p className="text-sm text-[var(--color-text-soft)]">
        For technical-pass LOI and rejection letters, use{" "}
        <code className="text-[var(--color-primary)]">{`{{suppliername}}`}</code> /{" "}
        <code className="text-[var(--color-primary)]">{`{{bidder_address}}`}</code> for the
        addressee and a single <code className="text-[var(--color-primary)]">{`{{cc_block}}`}</code>{" "}
        at the end. That placeholder outputs CC:, then default recipients from settings, then all
        other bidders.
      </p>

      <LetterDefaultCcSettings />

      <BidTypeTemplateSettings
        templateType="LOI_PASS"
        title="LOI (technical pass) by bid type"
        description="One template per bid type. Generated once per bidder who passed technical evaluation."
        uploadLabel="LOI pass template"
        defaultTemplateName="Default LOI technical pass template"
      />

      <BidTypeTemplateSettings
        templateType="LOI_FAIL"
        title="Rejection letter by bid type"
        description="One template per bid type. Generated once per bidder who failed technical evaluation."
        uploadLabel="rejection template"
        defaultTemplateName="Default rejection letter template"
      />

      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-[var(--color-text)]">
          Other letter templates
        </h3>
        {GLOBAL_LETTER_TEMPLATES.map((cfg) => (
          <GlobalDocumentTemplateSettings
            key={cfg.type}
            templateType={cfg.type}
            title={cfg.title}
            description={cfg.description}
            defaultTemplateName={cfg.defaultName}
            uploadLabel={cfg.uploadLabel}
          />
        ))}
      </div>
    </div>
  );
}
