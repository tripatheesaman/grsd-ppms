import type { DocumentTemplateType } from "@prisma/client";
import { WORKFLOW_STAGE_DEFINITIONS, type WorkflowStageKey } from "@/lib/procurement/stage-field-catalog";

export type StageTemplateSlot = {
  id: string;
  stageKey: string;
  slotKey: string;
  label: string;
  description: string | null;
  documentType: DocumentTemplateType | null;
  bidTypeScoped: boolean;
  sortOrder: number;
  isBuiltin: boolean;
  isActive: boolean;
};

export const DOCUMENT_TEMPLATE_TYPE_OPTIONS: Array<{
  value: DocumentTemplateType;
  label: string;
}> = [
  { value: "NOTICE", label: "Notice" },
  { value: "LOI_PASS", label: "LOI (technical pass)" },
  { value: "LOI_FAIL", label: "Rejection letter" },
  { value: "LOI_WINNER", label: "Winner LOI" },
  { value: "LOA", label: "Letter of acceptance (LOA)" },
  { value: "CONTRACT", label: "Contract agreement" },
];

export const BUILTIN_STAGE_TEMPLATE_SLOTS: Array<{
  id: string;
  stageKey: WorkflowStageKey;
  slotKey: string;
  label: string;
  description: string;
  documentType: DocumentTemplateType;
  bidTypeScoped: boolean;
  sortOrder: number;
}> = [
  {
    id: "slot_notice",
    stageKey: "procurement_create",
    slotKey: "notice",
    label: "Notice",
    description: "Published procurement notice document",
    documentType: "NOTICE",
    bidTypeScoped: true,
    sortOrder: 0,
  },
  {
    id: "slot_loi_pass",
    stageKey: "LETTERS_SENT",
    slotKey: "loi_pass",
    label: "LOI (technical pass)",
    description: "Letter of intent for bidders who passed technical evaluation",
    documentType: "LOI_PASS",
    bidTypeScoped: true,
    sortOrder: 0,
  },
  {
    id: "slot_loi_fail",
    stageKey: "LETTERS_SENT",
    slotKey: "loi_fail",
    label: "Rejection letter",
    description: "Rejection letter for bidders who failed technical evaluation",
    documentType: "LOI_FAIL",
    bidTypeScoped: true,
    sortOrder: 1,
  },
  {
    id: "slot_loi_winner",
    stageKey: "committee_decision",
    slotKey: "loi_winner",
    label: "Winner LOI",
    description: "Letter of intent for the winning bidder",
    documentType: "LOI_WINNER",
    bidTypeScoped: false,
    sortOrder: 0,
  },
  {
    id: "slot_loa",
    stageKey: "LOI_ISSUED",
    slotKey: "loa",
    label: "Letter of acceptance (LOA)",
    description: "LOA document after LOI is issued",
    documentType: "LOA",
    bidTypeScoped: false,
    sortOrder: 0,
  },
  {
    id: "slot_contract",
    stageKey: "LOA_ISSUED",
    slotKey: "contract",
    label: "Contract agreement",
    description: "Contract document after LOA is issued",
    documentType: "CONTRACT",
    bidTypeScoped: false,
    sortOrder: 0,
  },
];

export function getWorkflowStageLabel(stageKey: string): string {
  return WORKFLOW_STAGE_DEFINITIONS.find((s) => s.key === stageKey)?.label ?? stageKey;
}

export function slugifySlotKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
