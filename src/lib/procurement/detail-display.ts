import { formatCurrency } from "@/lib/currency";
import {
  BID_AMOUNT_KIND_WITHOUT_VAT,
  BID_AMOUNT_KIND_WITH_VAT,
} from "@/lib/procurement/bid-amount-lines";
import { formatBidVsCostEstimateLabel } from "@/lib/formulas/pg-calculator";
import { formatDualDate } from "@/lib/dates/display";
import { getWorkflowStageDefinition } from "@/lib/procurement/stage-field-catalog";
export type DateEntry = {
  label: string;
  date: string | null;
  displayDate: string;
};

function parseSortKey(date: string | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  const t = Date.parse(date);
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function dateEntry(label: string, date: string | null): DateEntry {
  return { label, date, displayDate: formatDualDate(date) };
}

export function sortDateEntries(entries: DateEntry[]): DateEntry[] {
  return [...entries]
    .filter((e) => e.date)
    .sort((a, b) => parseSortKey(a.date) - parseSortKey(b.date));
}

export function buildTimelineEntries(proc: Record<string, unknown>): DateEntry[] {
  return sortDateEntries([
    dateEntry("Notice", str(proc.noticeDate)),
    dateEntry("Pre-bid", str(proc.prebidDate)),
    dateEntry("Bid fee submission", str(proc.bidFeeSubmissionDate)),
    dateEntry("Bid open", str(proc.bidOpenDate)),
    dateEntry("Bid validity", str(proc.bidValidityDate)),
    dateEntry("Bid security validity", str(proc.bidSecurityValidityDate)),
    dateEntry("Price bid open", str(proc.priceBidOpenDate)),
    dateEntry("Technical evaluation sent", str(proc.technicalEvalSentDate)),
    dateEntry("Evaluation committee sent", str(proc.evaluationCommitteeSentDate)),
    dateEntry("LOI issued", str(proc.loiIssuedDate)),
    dateEntry("LOA document date", str(proc.loaDocumentDate)),
    dateEntry("LOA issued", str(proc.loaIssuedDate)),
    dateEntry("PG validity", str(proc.pgValidityDate)),
    dateEntry("Contract agreement", str(proc.contractAgreementDate)),
    dateEntry("Contract signed", str(proc.contractSignedDate)),
    dateEntry("PO issued", str(proc.poIssueDate)),
    dateEntry("PDI start", str(proc.pdiDate)),
    dateEntry("PDI end", str(proc.pdiEndDate)),
    dateEntry("Work due", str(proc.workCountdownDueDate)),
    dateEntry("Delivery received", str(proc.deliveryReceivedDate)),
    dateEntry("Pre-bid held (recorded)", str(proc.prebidAcknowledgedAt)),
    dateEntry("Bid opened (recorded)", str(proc.bidOpenAcknowledgedAt)),
    dateEntry("Price bid opened (recorded)", str(proc.priceBidAcknowledgedAt)),
    dateEntry("Period begun", str(proc.periodBegunAt)),
  ]);
}

export function buildScheduledEntries(proc: Record<string, unknown>): DateEntry[] {
  return sortDateEntries([
    dateEntry("Work initiation (scheduled)", str(proc.scheduledInitiationDate)),
    dateEntry("Work completion (scheduled)", str(proc.scheduledCompletionDate)),
  ]);
}

export type DetailRow = { label: string; value: string };

export type ProcurementReferenceView = {
  type: string;
  number: string;
  code?: string;
};

export function getProcurementReferences(
  proc: Record<string, unknown>,
): ProcurementReferenceView[] {
  const raw = proc.references as
    | Array<{ type?: string; number?: string; code?: string }>
    | undefined;
  if (!raw?.length) return [];
  return raw
    .filter((r) => r.number?.trim())
    .map((r) => ({
      type: r.type?.trim() || r.code?.trim() || "Reference",
      number: String(r.number).trim(),
      code: r.code,
    }));
}

/** Rows for the summary card (one row per reference type). */
export function buildSummaryReferenceRows(proc: Record<string, unknown>): DetailRow[] {
  const refs = getProcurementReferences(proc);
  if (!refs.length) {
    return [{ label: "Reference numbers", value: "—" }];
  }
  return refs.map((r) => ({ label: r.type, value: r.number }));
}

type BidAmountLineInfo = {
  amountKind: string;
  currencyCode: string;
  amount: number;
  forexRate: number | null;
  nprAmount: number;
};

type WinnerInfo = {
  name: string;
  bidCurrencyCode?: string | null;
  bidCurrencyName?: string | null;
  bidCurrencySymbol?: string | null;
  paymentConditionCode?: string | null;
  paymentConditionName?: string | null;
  bidAmountWithVat: number | null;
  bidAmountWithoutVat: number | null;
  bidAmountLines?: BidAmountLineInfo[];
};

export function getWinnerInfo(proc: Record<string, unknown>): WinnerInfo | null {
  const winnerBidder = proc.winnerBidder as WinnerInfo | null | undefined;
  if (winnerBidder?.name) return winnerBidder;

  const bidders = (proc.bidders as Array<Record<string, unknown>> | undefined) ?? [];
  const winner = bidders.find((b) => b.isWinner);
  if (!winner) return null;

  return {
    name: String(winner.name),
    bidCurrencyCode: winner.bidCurrencyCode ? String(winner.bidCurrencyCode) : null,
    bidCurrencyName: winner.bidCurrencyName ? String(winner.bidCurrencyName) : null,
    bidCurrencySymbol: winner.bidCurrencySymbol ? String(winner.bidCurrencySymbol) : null,
    paymentConditionCode: winner.paymentConditionCode
      ? String(winner.paymentConditionCode)
      : null,
    paymentConditionName: winner.paymentConditionName
      ? String(winner.paymentConditionName)
      : null,
    bidAmountWithVat:
      winner.bidAmountWithVat != null ? Number(winner.bidAmountWithVat) : null,
    bidAmountWithoutVat:
      winner.bidAmountWithoutVat != null ? Number(winner.bidAmountWithoutVat) : null,
    bidAmountLines: ((winner.bidAmountLines as BidAmountLineInfo[] | undefined) ?? []).map(
      (line) => ({
        amountKind: String(line.amountKind),
        currencyCode: String(line.currencyCode),
        amount: Number(line.amount),
        forexRate: line.forexRate != null ? Number(line.forexRate) : null,
        nprAmount: Number(line.nprAmount),
      }),
    ),
  };
}

function formatBidLineValue(line: BidAmountLineInfo): string {
  const amount = formatCurrency(line.amount, { currencyCode: line.currencyCode });
  if (line.forexRate != null) {
    return `${amount} @ ${line.forexRate} = ${formatCurrency(line.nprAmount)}`;
  }
  return amount;
}

function workDaysTotal(proc: Record<string, unknown>): number {
  const stored = proc.workCountdownTotalDays;
  if (stored != null && stored !== "") return Number(stored);
  const workDays =
    (proc.workDays as Array<{ days: number }> | undefined) ?? [];
  return workDays.reduce((sum, w) => sum + (w.days ?? 0), 0);
}

/** Winner bid amounts, PG, warranty, and work days (after committee decision). */
export function buildWinnerAwardRows(proc: Record<string, unknown>): DetailRow[] {
  const winner = getWinnerInfo(proc);
  if (!winner) return [];

  const rows: DetailRow[] = [
    { label: "Winner", value: winner.name },
    {
      label: "Bid amount (ex-VAT, NPR total)",
      value: formatCurrency(winner.bidAmountWithoutVat),
    },
  ];

  const withoutVatLines =
    winner.bidAmountLines?.filter((line) => line.amountKind === BID_AMOUNT_KIND_WITHOUT_VAT) ?? [];
  for (const line of withoutVatLines) {
    rows.push({
      label: `Ex-VAT line (${line.currencyCode})`,
      value: formatBidLineValue(line),
    });
  }

  if (winner.bidAmountWithVat != null) {
    rows.push({
      label: "Bid amount (with VAT, NPR total)",
      value: formatCurrency(winner.bidAmountWithVat),
    });
    const withVatLines =
      winner.bidAmountLines?.filter((line) => line.amountKind === BID_AMOUNT_KIND_WITH_VAT) ?? [];
    for (const line of withVatLines) {
      rows.push({
        label: `With VAT line (${line.currencyCode})`,
        value: formatBidLineValue(line),
      });
    }
  }

  rows.push(
    { label: "Bid currency", value: winner.bidCurrencyCode ?? "—" },
    { label: "Payment condition", value: winner.paymentConditionName ?? "—" },
    {
      label: "Bid vs cost estimate",
      value:
        winner.bidAmountWithoutVat != null
          ? formatBidVsCostEstimateLabel(
              Number(proc.costEstimate),
              winner.bidAmountWithoutVat,
            )
          : "—",
    },
  );

  if (proc.pgAmount != null) {
    rows.push({
      label: "PG amount",
      value: formatCurrency(proc.pgAmount as number),
    });
  }
  if (proc.warrantyDays != null) {
    rows.push({ label: "Warranty days", value: String(proc.warrantyDays) });
  }

  const totalWorkDays = workDaysTotal(proc);
  if (totalWorkDays > 0) {
    rows.push({ label: "Work days (total)", value: String(totalWorkDays) });
  }

  const workDays =
    (proc.workDays as Array<{ categoryName: string; days: number }> | undefined) ?? [];
  for (const w of workDays.filter((row) => row.days > 0)) {
    rows.push({ label: w.categoryName, value: `${w.days} days` });
  }

  return rows;
}

/** Key workflow dates entered after technical evaluation. */
export function buildAwardWorkflowDateRows(proc: Record<string, unknown>): DetailRow[] {
  const entries: Array<[string, string | null]> = [
    ["Sent to evaluation committee", str(proc.evaluationCommitteeSentDate)],
    ["Price bid opening", str(proc.priceBidOpenDate)],
    ["LOI issued", str(proc.loiIssuedDate)],
    ["LOA document date", str(proc.loaDocumentDate)],
    ["LOA issued", str(proc.loaIssuedDate)],
    ["CIN number", str(proc.cinNumber)],
    ["Supplier witness", str(proc.supplierWitnessName)],
    ["Supplier witness designation", str(proc.supplierWitnessDesignation)],
    ["Supplier signing authority", str(proc.supplierSigningAuthorityName)],
    [
      "Supplier signing authority designation",
      str(proc.supplierSigningAuthorityDesignation),
    ],
    ["PG validity", str(proc.pgValidityDate)],
    ["Contract agreement", str(proc.contractAgreementDate)],
    ["Contract signed", str(proc.contractSignedDate)],
    ["PO issued", str(proc.poIssueDate)],
    ["PDI start", str(proc.pdiDate)],
    ["PDI end", str(proc.pdiEndDate)],
    ["Work due", str(proc.workCountdownDueDate)],
  ];

  return entries
    .filter(([, value]) => value)
    .map(([label, value]) =>
      label === "CIN number" ? { label, value: value! } : { label, value: formatDualDate(value!) },
    );
}

/** Work countdown when PO has been issued. */
export function buildWorkProgressRows(proc: Record<string, unknown>): DetailRow[] {
  if (proc.poIssueDate == null || proc.workCountdownTotalDays == null) return [];

  const rows: DetailRow[] = [
    {
      label: "Work progress",
      value: `${proc.workCountdownElapsedDays ?? 0} / ${proc.workCountdownTotalDays} days${
        proc.workCountdownPaused ? " (paused — PDI)" : ""
      }`,
    },
  ];

  if (proc.workCountdownDueDate) {
    rows.push({
      label: "Work due date",
      value: formatDualDate(str(proc.workCountdownDueDate)),
    });
  }
  if (proc.deliveryReceivedDate) {
    rows.push({
      label: "Final delivery date",
      value: formatDualDate(str(proc.deliveryReceivedDate)),
    });
  }
  if (proc.deliveryPerformance && proc.deliveryVarianceDays != null) {
    const absDays = Math.abs(Number(proc.deliveryVarianceDays));
    const performanceLabel =
      proc.deliveryPerformance === "ON_TIME"
        ? "On time"
        : proc.deliveryPerformance === "EARLY"
          ? `Completed ${absDays} day${absDays === 1 ? "" : "s"} early`
          : `Delayed by ${absDays} day${absDays === 1 ? "" : "s"}`;
    rows.push({
      label: "Delivery performance",
      value: performanceLabel,
    });
  }

  const pdiMembers =
    (proc.pdiMembers as Array<{ name?: string; designation?: string }> | undefined) ?? [];
  if (pdiMembers.length > 0) {
    rows.push({
      label: "PDI members",
      value: pdiMembers
        .map((m) => `${String(m.name ?? "").trim()} - ${String(m.designation ?? "").trim()}`)
        .filter((line) => line !== " - ")
        .join(", "),
    });
  }

  return rows;
}

/** All extra summary rows: winner financials, workflow dates, work progress. */
export function buildSummaryAwardRows(proc: Record<string, unknown>): DetailRow[] {
  return [
    ...buildWinnerAwardRows(proc),
    ...buildAwardWorkflowDateRows(proc),
    ...buildWorkProgressRows(proc),
  ];
}

export function buildWorkflowCustomFieldSections(
  proc: Record<string, unknown>,
): Array<{ title: string; rows: DetailRow[] }> {
  const values =
    (proc.workflowFieldValues as
      | Array<{ stageKey: string; label: string; fieldType: string; value: string }>
      | undefined) ?? [];
  if (!values.length) return [];

  const byStage = new Map<string, DetailRow[]>();
  for (const item of values) {
    if (!item.value?.trim()) continue;
    const rows = byStage.get(item.stageKey) ?? [];
    rows.push({
      label: item.label,
      value: item.fieldType === "DATE" ? formatDualDate(item.value) : item.value,
    });
    byStage.set(item.stageKey, rows);
  }

  return [...byStage.entries()]
    .filter(([, rows]) => rows.length > 0)
    .map(([stageKey, rows]) => ({
      title: getWorkflowStageDefinition(stageKey)?.label ?? stageKey,
      rows,
    }));
}

export function buildFullDetailSections(
  proc: Record<string, unknown>,
): Array<{ title: string; rows: DetailRow[] }> {
  const refs = getProcurementReferences(proc);
  const workDays =
    (proc.workDays as Array<{ categoryName: string; days: number }> | undefined) ?? [];
  const bidders = (proc.bidders as Array<Record<string, unknown>> | undefined) ?? [];
  const winnerRows = buildWinnerAwardRows(proc);
  const awardDateRows = buildAwardWorkflowDateRows(proc);
  const workProgressRows = buildWorkProgressRows(proc);
  const workflowSections = buildWorkflowCustomFieldSections(proc);

  return [
    {
      title: "Identification",
      rows: [
        { label: "Title", value: str(proc.title) ?? "—" },
        { label: "Item", value: str(proc.itemName) ?? "—" },
        { label: "DTSSR number", value: str(proc.dtssrNumber) ?? "—" },
        { label: "Status", value: str(proc.status) ?? "—" },
      ],
    },
    {
      title: "Classification",
      rows: [
        { label: "Media of bid", value: name(proc.mediaOfBid) },
        { label: "Type of bid", value: name(proc.bidType) },
        { label: "SBD", value: name(proc.sbd) },
        { label: "Contract type", value: name(proc.contractType) },
        { label: "Unit", value: name(proc.unit) },
      ],
    },
    {
      title: "Financial",
      rows: [
        { label: "Cost estimate", value: formatCurrency(proc.costEstimate as number) },
        { label: "BSF %", value: proc.bsfPercent != null ? String(proc.bsfPercent) : "—" },
        { label: "Bid fee", value: formatCurrency(proc.bidFee as number) },
        { label: "Bid security", value: formatCurrency(proc.bidSecurity as number) },
        { label: "Grand total with VAT", value: formatCurrency(proc.grandTotalWithVat as number) },
        { label: "Total quantity", value: fmtNum(proc.totalQuantity) },
        { label: "Bid validity (days)", value: str(proc.bidValidityDays) ?? "—" },
      ],
    },
    ...(winnerRows.length > 0 ? [{ title: "Winner & award", rows: winnerRows }] : []),
    ...(awardDateRows.length > 0
      ? [{ title: "Award & contract dates", rows: awardDateRows }]
      : []),
    ...(workProgressRows.length > 0
      ? [{ title: "Work progress", rows: workProgressRows }]
      : []),
    {
      title: "Reference numbers",
      rows:
        refs.length > 0
          ? refs.map((r) => ({ label: r.type, value: r.number }))
          : [{ label: "Reference numbers", value: "None" }],
    },
    {
      title: "Work day categories",
      rows:
        workDays.length > 0
          ? workDays.map((w) => ({ label: w.categoryName, value: String(w.days) }))
          : [{ label: "—", value: "None" }],
    },
    {
      title: "Times",
      rows: [
        { label: "Pre-bid time", value: str(proc.prebidTime) ?? "—" },
        { label: "Bid submission time", value: str(proc.bidSubmissionTime) ?? "—" },
        { label: "Bid open time", value: str(proc.bidOpenTime) ?? "—" },
      ],
    },
    {
      title: "Timeline dates",
      rows: buildTimelineEntries(proc).map((e) => ({
        label: e.label,
        value: e.displayDate,
      })),
    },
    {
      title: "Scheduled dates",
      rows:
        buildScheduledEntries(proc).length > 0
          ? buildScheduledEntries(proc).map((e) => ({
              label: e.label,
              value: e.displayDate,
            }))
          : [{ label: "—", value: "Not set" }],
    },
    {
      title: "Contract & period",
      rows: [
        { label: "Period begun", value: formatDualDate(str(proc.periodBegunAt)) },
        { label: "PO issue date", value: formatDualDate(str(proc.poIssueDate)) },
        { label: "Contract frozen at", value: formatDualDate(str(proc.contractFrozenAt)) },
        { label: "Contract elapsed days", value: str(proc.contractElapsedDays) ?? "—" },
        { label: "PDI completed at", value: formatDualDate(str(proc.pdiCompletedAt)) },
        { label: "Rules snapshot saved", value: str(proc.settingsSnapshotAt) ?? "—" },
      ],
    },
    {
      title: "Bidders",
      rows:
        bidders.length > 0
          ? bidders.flatMap((b, i) => {
              const rows: DetailRow[] = [
                { label: `Bidder ${i + 1} name`, value: String(b.name) },
                { label: `Bidder ${i + 1} address`, value: String(b.address) },
                {
                  label: `Bidder ${i + 1} bid response date`,
                  value: b.bidResponseDate
                    ? formatDualDate(String(b.bidResponseDate).slice(0, 10))
                    : "—",
                },
                {
                  label: `Bidder ${i + 1} technical`,
                  value:
                    b.passedTech == null ? "—" : b.passedTech ? "Pass" : "Fail",
                },
                {
                  label: `Bidder ${i + 1} winner`,
                  value: b.isWinner ? "Yes" : "No",
                },
              ];
              if (b.isWinner) {
                if (b.bidAmountWithoutVat != null) {
                  rows.push({
                    label: `Bidder ${i + 1} bid (ex-VAT)`,
                    value: formatCurrency(b.bidAmountWithoutVat as number, {
                      currencyCode: b.bidCurrencyCode ? String(b.bidCurrencyCode) : undefined,
                    }),
                  });
                }
                if (b.bidAmountWithVat != null) {
                  rows.push({
                    label: `Bidder ${i + 1} bid (with VAT)`,
                    value: formatCurrency(b.bidAmountWithVat as number, {
                      currencyCode: b.bidCurrencyCode ? String(b.bidCurrencyCode) : undefined,
                    }),
                  });
                }
              }
              return rows;
            })
          : [{ label: "—", value: "None" }],
    },
    ...workflowSections,
  ];
}

function str(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function name(rel: unknown): string {
  if (!rel || typeof rel !== "object") return "—";
  const n = (rel as { name?: string }).name;
  return n ?? "—";
}

function fmtNum(value: unknown): string {
  if (value == null || value === "") return "—";
  return Number(value).toLocaleString("en-NP");
}
