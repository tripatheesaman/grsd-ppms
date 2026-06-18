export type WorkflowStageKey =
  | "procurement_create"
  | "ACTIVE"
  | "PREBID_OPEN"
  | "bidder_entry"
  | "LETTERS_SENT"
  | "committee_decision"
  | "LOI_ISSUED"
  | "LOA_ISSUED"
  | "CONTRACT_SIGNED"
  | "IN_PROGRESS_PDI"
  | "IN_PROGRESS_COMPLETE"
  | "PDI_PHASE";

export type BuiltinFieldType = "text" | "number" | "date" | "time" | "textarea" | "select" | "group";

export type BuiltinWorkflowField = {
  fieldKey: string;
  label: string;
  fieldType: BuiltinFieldType;
  description?: string;
};

export type WorkflowStageDefinition = {
  key: WorkflowStageKey;
  label: string;
  description: string;
  fields: BuiltinWorkflowField[];
};

export const WORKFLOW_STAGE_DEFINITIONS: WorkflowStageDefinition[] = [
  {
    key: "procurement_create",
    label: "New / edit procurement",
    description: "Fields on the create and edit procurement form",
    fields: [
      { fieldKey: "title", label: "Title", fieldType: "text" },
      { fieldKey: "itemName", label: "Item name", fieldType: "text" },
      { fieldKey: "dtssrNumber", label: "DTSSR number", fieldType: "text" },
      { fieldKey: "references", label: "Reference numbers", fieldType: "group" },
      { fieldKey: "mediaOfBidId", label: "Media of bid", fieldType: "select" },
      { fieldKey: "bidTypeId", label: "Bid type", fieldType: "select" },
      { fieldKey: "sbdId", label: "SBD", fieldType: "select" },
      { fieldKey: "contractTypeId", label: "Contract type", fieldType: "select" },
      { fieldKey: "unitId", label: "Unit", fieldType: "select" },
      { fieldKey: "costEstimate", label: "Cost estimate", fieldType: "number" },
      { fieldKey: "bsfPercent", label: "BSF percent", fieldType: "number" },
      { fieldKey: "totalQuantity", label: "Total quantity", fieldType: "number" },
      { fieldKey: "noticeDate", label: "Notice date", fieldType: "date" },
      { fieldKey: "scheduledInitiationDate", label: "Scheduled initiation", fieldType: "date" },
      { fieldKey: "scheduledCompletionDate", label: "Scheduled completion", fieldType: "date" },
      { fieldKey: "prebidTime", label: "Pre-bid time", fieldType: "time" },
      { fieldKey: "bidSubmissionTime", label: "Bid submission time", fieldType: "time" },
      { fieldKey: "bidOpenTime", label: "Bid open time", fieldType: "time" },
    ],
  },
  {
    key: "ACTIVE",
    label: "Record pre-bid meeting",
    description: "When procurement is active — confirm pre-bid date",
    fields: [{ fieldKey: "prebidAcknowledgedAt", label: "Pre-bid date", fieldType: "date" }],
  },
  {
    key: "PREBID_OPEN",
    label: "Pre-bid open → bid opening",
    description: "Set bid open date after pre-bid",
    fields: [{ fieldKey: "bidOpenDate", label: "Bid open date", fieldType: "date" }],
  },
  {
    key: "bidder_entry",
    label: "Bidder entry",
    description: "Fields when adding or editing bidders",
    fields: [
      { fieldKey: "name", label: "Bidder name", fieldType: "text" },
      { fieldKey: "address", label: "Address", fieldType: "textarea" },
      { fieldKey: "phone", label: "Phone", fieldType: "text" },
      { fieldKey: "bidResponseDate", label: "Bid response date", fieldType: "date" },
    ],
  },
  {
    key: "LETTERS_SENT",
    label: "Price bid opening",
    description: "Schedule and open price bid",
    fields: [{ fieldKey: "priceBidOpenDate", label: "Price bid opening date", fieldType: "date" }],
  },
  {
    key: "committee_decision",
    label: "Evaluation committee decision",
    description: "Winner, amounts, warranty, and work days",
    fields: [
      { fieldKey: "winnerBidderId", label: "Winner bidder", fieldType: "select" },
      { fieldKey: "bidCurrencyId", label: "Bid currency", fieldType: "select" },
      { fieldKey: "paymentConditionId", label: "Payment condition", fieldType: "select" },
      { fieldKey: "bidAmountWithVat", label: "Bid amounts (with VAT, optional)", fieldType: "group" },
      { fieldKey: "bidAmountWithoutVat", label: "Bid amounts (without VAT)", fieldType: "group" },
      { fieldKey: "warrantyDays", label: "Warranty days", fieldType: "number" },
      { fieldKey: "workDays", label: "Work days by category", fieldType: "group" },
    ],
  },
  {
    key: "LOI_ISSUED",
    label: "Issue LOA",
    description: "LOA document date after LOI",
    fields: [{ fieldKey: "loaDocumentDate", label: "LOA document date", fieldType: "date" }],
  },
  {
    key: "LOA_ISSUED",
    label: "Contract agreement",
    description: "CIN, supplier witnesses, and contract date",
    fields: [
      { fieldKey: "cinNumber", label: "CIN number", fieldType: "text" },
      { fieldKey: "supplierWitnessName", label: "Supplier witness name", fieldType: "text" },
      { fieldKey: "supplierWitnessDesignation", label: "Supplier witness designation", fieldType: "text" },
      { fieldKey: "supplierSigningAuthorityName", label: "Supplier signing authority name", fieldType: "text" },
      { fieldKey: "supplierSigningAuthorityDesignation", label: "Supplier signing authority designation", fieldType: "text" },
      { fieldKey: "contractAgreementDate", label: "Contract agreement date", fieldType: "date" },
    ],
  },
  {
    key: "CONTRACT_SIGNED",
    label: "PO issue",
    description: "Purchase order issue date",
    fields: [{ fieldKey: "poIssueDate", label: "PO issue date", fieldType: "date" }],
  },
  {
    key: "IN_PROGRESS_PDI",
    label: "Begin PDI",
    description: "PDI start date and members",
    fields: [
      { fieldKey: "pdiDate", label: "PDI start date", fieldType: "date" },
      { fieldKey: "pdiMemberName", label: "PDI member name", fieldType: "text" },
      { fieldKey: "pdiMemberDesignation", label: "PDI member designation", fieldType: "text" },
    ],
  },
  {
    key: "IN_PROGRESS_COMPLETE",
    label: "Mark completed",
    description: "Final delivery date when completing work",
    fields: [{ fieldKey: "deliveryReceivedDate", label: "Final delivery date", fieldType: "date" }],
  },
  {
    key: "PDI_PHASE",
    label: "End PDI",
    description: "PDI end date when resuming work",
    fields: [{ fieldKey: "pdiEndDate", label: "PDI end date", fieldType: "date" }],
  },
];

export function getWorkflowStageDefinition(key: string): WorkflowStageDefinition | undefined {
  return WORKFLOW_STAGE_DEFINITIONS.find((s) => s.key === key);
}

export function getBuiltinField(stageKey: string, fieldKey: string): BuiltinWorkflowField | undefined {
  return getWorkflowStageDefinition(stageKey)?.fields.find((f) => f.fieldKey === fieldKey);
}

export function slugifyFieldKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export const WORKFLOW_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "TEXTAREA", label: "Long text" },
  { value: "SELECT", label: "Dropdown" },
] as const;

export type CustomWorkflowField = {
  id: string;
  stageKey: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  optionsJson: string[] | null;
  anchorFieldKey: string;
  position: "BEFORE" | "AFTER";
  sortOrder: number;
  required: boolean;
  hint: string | null;
  isActive: boolean;
};

export type LayoutFieldItem =
  | { kind: "builtin"; fieldKey: string; label: string; fieldType: string }
  | {
      kind: "custom";
      id: string;
      fieldKey: string;
      label: string;
      fieldType: string;
      optionsJson: string[] | null;
      required: boolean;
      hint: string | null;
    };

export type WorkflowFieldOrderEntry = {
  fieldRef: string;
  sortOrder: number;
};

export function builtinFieldRef(fieldKey: string): string {
  return `builtin:${fieldKey}`;
}

export function customFieldRef(fieldId: string): string {
  return `custom:${fieldId}`;
}

export function layoutItemFieldRef(item: LayoutFieldItem): string {
  return item.kind === "builtin" ? builtinFieldRef(item.fieldKey) : customFieldRef(item.id);
}

export function buildWorkflowFieldLayout(
  stageKey: string,
  customFields: CustomWorkflowField[],
  options?: { visibleBuiltinKeys?: string[]; fieldOrder?: WorkflowFieldOrderEntry[] },
): LayoutFieldItem[] {
  const defaultLayout = buildDefaultWorkflowFieldLayout(stageKey, customFields, options?.visibleBuiltinKeys);
  if (!options?.fieldOrder?.length) return defaultLayout;
  return applyWorkflowFieldOrder(defaultLayout, options.fieldOrder);
}

function buildDefaultWorkflowFieldLayout(
  stageKey: string,
  customFields: CustomWorkflowField[],
  visibleBuiltinKeys?: string[],
): LayoutFieldItem[] {
  const stage = getWorkflowStageDefinition(stageKey);
  if (!stage) return [];

  const visibleKeys = visibleBuiltinKeys ? new Set(visibleBuiltinKeys) : null;

  const activeCustom = customFields
    .filter((f) => f.stageKey === stageKey && f.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  const result: LayoutFieldItem[] = [];

  for (const builtin of stage.fields) {
    if (visibleKeys && !visibleKeys.has(builtin.fieldKey)) continue;
    const before = activeCustom.filter(
      (c) => c.anchorFieldKey === builtin.fieldKey && c.position === "BEFORE",
    );
    for (const c of before) {
      result.push(customToLayoutItem(c));
    }

    result.push({
      kind: "builtin",
      fieldKey: builtin.fieldKey,
      label: builtin.label,
      fieldType: builtin.fieldType,
    });

    const after = activeCustom.filter(
      (c) => c.anchorFieldKey === builtin.fieldKey && c.position === "AFTER",
    );
    for (const c of after) {
      result.push(customToLayoutItem(c));
    }
  }

  const orphanCustom = activeCustom.filter((c) => {
    const anchorExists = stage.fields.some((f) => f.fieldKey === c.anchorFieldKey);
    return !anchorExists;
  });
  for (const c of orphanCustom) {
    if (!result.some((r) => r.kind === "custom" && r.id === c.id)) {
      result.push(customToLayoutItem(c));
    }
  }

  return result;
}

export function applyWorkflowFieldOrder(
  defaultLayout: LayoutFieldItem[],
  fieldOrder: WorkflowFieldOrderEntry[],
): LayoutFieldItem[] {
  const byRef = new Map(defaultLayout.map((item) => [layoutItemFieldRef(item), item]));
  const sorted = [...fieldOrder].sort((a, b) => a.sortOrder - b.sortOrder || a.fieldRef.localeCompare(b.fieldRef));
  const ordered: LayoutFieldItem[] = [];
  const used = new Set<string>();

  for (const entry of sorted) {
    const item = byRef.get(entry.fieldRef);
    if (!item || used.has(entry.fieldRef)) continue;
    ordered.push(item);
    used.add(entry.fieldRef);
  }

  for (const item of defaultLayout) {
    const ref = layoutItemFieldRef(item);
    if (!used.has(ref)) ordered.push(item);
  }

  return ordered;
}

function customToLayoutItem(c: CustomWorkflowField): LayoutFieldItem {
  return {
    kind: "custom",
    id: c.id,
    fieldKey: c.fieldKey,
    label: c.label,
    fieldType: c.fieldType,
    optionsJson: c.optionsJson,
    required: c.required,
    hint: c.hint,
  };
}

export function parseSelectOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
