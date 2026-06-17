export type PlaceholderCategory =
  | "General"
  | "Classification"
  | "Financial"
  | "Settings"
  | "Dates"
  | "Times"
  | "References"
  | "Work days"
  | "Workflow"
  | "Bidders";

export type PlaceholderCatalogEntry = {
  token: string;
  key: string;
  label: string;
  category: PlaceholderCategory;
};

export const STATIC_PLACEHOLDER_FIELDS: Array<{
  key: string;
  label: string;
  category: PlaceholderCategory;
}> = [
  { key: "title", label: "Procurement title", category: "General" },
  { key: "item_name", label: "Item name", category: "General" },
  { key: "dtssr_number", label: "DTSSR number", category: "General" },
  { key: "status", label: "Status code", category: "General" },
  { key: "status_label", label: "Status label", category: "General" },
  { key: "media_of_bid", label: "Media of bid", category: "Classification" },
  { key: "bid_type", label: "Type of bid", category: "Classification" },
  { key: "bid_type_default_days", label: "Bid type default bid days", category: "Classification" },
  { key: "bid_days", label: "Bid period days (used for calculation)", category: "Classification" },
  { key: "sbd", label: "SBD name", category: "Classification" },
  { key: "contract_type", label: "Contract type", category: "Classification" },
  { key: "unit", label: "Unit name", category: "Classification" },
  { key: "unit_symbol", label: "Unit symbol", category: "Classification" },
  { key: "cost_estimate", label: "Cost estimate (formatted)", category: "Financial" },
  { key: "cost_estimate_words", label: "Cost estimate in words", category: "Financial" },
  { key: "bid_fee", label: "Bid fee (formatted)", category: "Financial" },
  { key: "bid_fee_words", label: "Bid fee in words", category: "Financial" },
  { key: "bid_security", label: "Bid security (formatted)", category: "Financial" },
  { key: "bid_security_words", label: "Bid security in words", category: "Financial" },
  { key: "grand_total_with_vat", label: "Grand total with VAT (formatted)", category: "Financial" },
  { key: "grand_total_with_vat_words", label: "Grand total with VAT in words", category: "Financial" },
  { key: "bsf_percent", label: "BSF / bid security fee percent (procurement)", category: "Financial" },
  { key: "total_quantity", label: "Total quantity", category: "Financial" },
  { key: "bid_validity_days", label: "Bid validity days", category: "Financial" },
  { key: "vat_percent", label: "VAT percent (settings)", category: "Settings" },
  { key: "bsf_min_percent", label: "BSF minimum percent (settings)", category: "Settings" },
  { key: "bsf_max_percent", label: "BSF maximum percent (settings)", category: "Settings" },
  { key: "bsf_default_percent", label: "BSF default percent (settings)", category: "Settings" },
  { key: "prebid_offset_days", label: "Pre-bid offset days (settings)", category: "Settings" },
  { key: "completion_buffer_days", label: "Completion buffer days (settings)", category: "Settings" },
  { key: "loa_delay_days", label: "LOA delay days (settings)", category: "Settings" },
  { key: "pg_amount", label: "Performance guarantee amount (formatted)", category: "Financial" },
  { key: "pg_amount_words", label: "PG amount in words", category: "Financial" },
  { key: "bid_currency_code", label: "Winner bid currency code", category: "Financial" },
  { key: "bid_currency_symbol", label: "Winner bid currency symbol", category: "Financial" },
  { key: "bid_currency_name", label: "Winner bid currency name", category: "Financial" },
  { key: "payment_condition_code", label: "Winner payment condition code", category: "Workflow" },
  { key: "payment_condition_name", label: "Winner payment condition name", category: "Workflow" },
  { key: "bid_amount_with_vat", label: "Winner bid amount with VAT", category: "Financial" },
  { key: "bid_amount_without_vat", label: "Winner bid amount without VAT", category: "Financial" },
  { key: "warranty_days", label: "Warranty days", category: "Workflow" },
  { key: "cin_number", label: "CIN number", category: "Workflow" },
  { key: "supplier_witness_name", label: "Supplier witness name", category: "Workflow" },
  {
    key: "supplier_witness_designation",
    label: "Supplier witness designation",
    category: "Workflow",
  },
  {
    key: "supplier_signing_authority_name",
    label: "Supplier signing authority name",
    category: "Workflow",
  },
  {
    key: "supplier_signing_authority_designation",
    label: "Supplier signing authority designation",
    category: "Workflow",
  },
  { key: "department_witness_name", label: "Department witness name", category: "Workflow" },
  {
    key: "department_witness_designation",
    label: "Department witness designation",
    category: "Workflow",
  },
  {
    key: "department_signing_authority_name",
    label: "Department signing authority name",
    category: "Workflow",
  },
  {
    key: "department_signing_authority_designation",
    label: "Department signing authority designation",
    category: "Workflow",
  },
  {
    key: "department_witnesses_lines",
    label: "All department witnesses (one per line: Name - Designation)",
    category: "Workflow",
  },
  {
    key: "department_signing_authorities_lines",
    label: "All department signing authorities (one per line: Name - Designation)",
    category: "Workflow",
  },
  { key: "prebid_time", label: "Pre-bid time", category: "Times" },
  { key: "bid_submission_time", label: "Bid submission time", category: "Times" },
  { key: "bid_open_time", label: "Bid open time", category: "Times" },
  { key: "references", label: "All references (Type: number, …)", category: "References" },
  { key: "references_lines", label: "All references (one per line)", category: "References" },
  { key: "work_days_list", label: "Work day categories (one per line)", category: "Work days" },
  { key: "work_days_total", label: "Total work days (all categories)", category: "Work days" },
  { key: "bidder_name", label: "Bidder name (letter addressee)", category: "Bidders" },
  { key: "bidder_address", label: "Bidder address (letter addressee)", category: "Bidders" },
  { key: "bidder_phone", label: "Bidder phone (letter addressee)", category: "Bidders" },
  {
    key: "suppliername",
    label: "Supplier name (alias of bidder_name; letter addressee)",
    category: "Bidders",
  },
  { key: "supplier_name", label: "Supplier name (alias)", category: "Bidders" },
  { key: "supplier_address", label: "Supplier address (alias of bidder_address)", category: "Bidders" },
  {
    key: "cc_block",
    label:
      "Full CC section (CC: + default recipients from settings + other bidders). Use this alone at end of letter.",
    category: "Bidders",
  },
  {
    key: "cc_lines",
    label: "CC lines only (no CC: header; same order as cc_block body)",
    category: "Bidders",
  },
  {
    key: "cc_bidders_only",
    label: "Bidder-only CC block (CC: + other bidders only, excludes default recipients)",
    category: "Bidders",
  },
  {
    key: "cc_bidders_only_lines",
    label: "Bidder-only CC lines (no CC: header; excludes default recipients)",
    category: "Bidders",
  },
];

export const DATE_PLACEHOLDER_FIELDS: Array<{
  prefix: string;
  label: string;
}> = [
  { prefix: "today", label: "Today date" },
  { prefix: "notice", label: "Notice date" },
  { prefix: "bid_fee_submission", label: "Bid fee submission date" },
  { prefix: "bid_open", label: "Bid open date" },
  { prefix: "prebid", label: "Pre-bid date" },
  { prefix: "bid_validity", label: "Bid validity date" },
  { prefix: "bid_security_validity", label: "Bid security validity date" },
  { prefix: "scheduled_initiation", label: "Scheduled work initiation date" },
  { prefix: "scheduled_completion", label: "Scheduled work completion date" },
  { prefix: "price_bid_open", label: "Price bid open date" },
  { prefix: "technical_eval_sent", label: "Technical evaluation sent date" },
  { prefix: "loi_issued", label: "LOI issued date" },
  { prefix: "loa_issued", label: "LOA issued date" },
  { prefix: "loa_document", label: "LOA document date" },
  { prefix: "contract_signed", label: "Contract signed date" },
  { prefix: "contract_agreement", label: "Contract agreement date" },
  { prefix: "evaluation_committee_sent", label: "Evaluation committee sent date" },
  { prefix: "pg_validity", label: "PG validity date" },
  { prefix: "pdi", label: "PDI date" },
  { prefix: "delivery_received", label: "Delivery received date" },
  { prefix: "prebid_acknowledged", label: "Pre-bid acknowledged date" },
  { prefix: "bid_open_acknowledged", label: "Bid open acknowledged date" },
  { prefix: "period_begun", label: "Procurement period begun date" },
];

export const REFERENCE_TYPE_CODES = ["IFB", "RFP", "EOI", "PQ"] as const;

function entry(key: string, label: string, category: PlaceholderCategory): PlaceholderCatalogEntry {
  return { token: `{{${key}}}`, key, label, category };
}

export function buildPlaceholderCatalog(): PlaceholderCatalogEntry[] {
  const catalog: PlaceholderCatalogEntry[] = STATIC_PLACEHOLDER_FIELDS.map((f) =>
    entry(f.key, f.label, f.category),
  );

  for (const d of DATE_PLACEHOLDER_FIELDS) {
    catalog.push(entry(`${d.prefix}_date`, `${d.label} (AD yyyy-mm-dd)`, "Dates"));
    catalog.push(entry(`${d.prefix}_date_bs`, `${d.label} (BS yyyy-mm-dd)`, "Dates"));
    catalog.push(entry(`${d.prefix}_date_dual`, `${d.label} (AD + BS short)`, "Dates"));
    catalog.push(entry(`${d.prefix}_date_long`, `${d.label} (formatted AD · BS)`, "Dates"));
  }

  for (const code of REFERENCE_TYPE_CODES) {
    const lower = code.toLowerCase();
    catalog.push(
      entry(`${lower}_number`, `${code} reference number`, "References"),
      entry(`ref_${lower}`, `${code} reference number (alias)`, "References"),
    );
  }

  catalog.push(
    entry(
      "ref_code_number",
      "Reference by type code — use ref_{code}_number (e.g. ref_ifb_number)",
      "References",
    ),
  );

  catalog.push(
    entry(
      "work_day_slug_days",
      "Work days by category — use work_day_{slug}_days (slug = lowercase name)",
      "Work days",
    ),
  );

  return catalog;
}

export const PLACEHOLDER_CATALOG = buildPlaceholderCatalog();

export const PLACEHOLDER_CATALOG_BY_CATEGORY = PLACEHOLDER_CATALOG.reduce<
  Record<string, PlaceholderCatalogEntry[]>
>((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {});

export function formatPlaceholderGuide(): string {
  const lines: string[] = [
    "PPMS Document Placeholder Guide",
    "",
    "Use double-brace tokens exactly as shown (e.g. {{title}}, {{ifb_number}}).",
    "Type or paste each token in one continuous piece — do not stop typing in the middle of a tag.",
    "If Word splits a tag, delete it and paste the full token again from this guide.",
    "",
  ];

  for (const category of Object.keys(PLACEHOLDER_CATALOG_BY_CATEGORY)) {
    lines.push(`=== ${category} ===`, "");
    for (const p of PLACEHOLDER_CATALOG_BY_CATEGORY[category]!) {
      lines.push(`${p.token} — ${p.label}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
