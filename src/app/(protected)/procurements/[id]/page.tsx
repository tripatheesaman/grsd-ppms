"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { CommitteeDecisionPanel } from "@/components/procurement/committee-decision-panel";
import { ProcurementCrudActions } from "@/components/procurement/procurement-crud-actions";
import { ProcurementFullDetails } from "@/components/procurement/procurement-full-details";
import { ProcurementTimeline } from "@/components/procurement/procurement-timeline";
import { WorkflowDateValidationToggle } from "@/components/procurement/workflow-date-validation-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBsHint } from "@/components/ui/date-bs-hint";
import { Input, Select } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { openDownloadUrl } from "@/lib/client/download-file";
import { countTechnicalLetterGenerations } from "@/lib/documents/technical-letters";
import { formatCurrency } from "@/lib/currency";
import { buildSummaryAwardRows, buildSummaryReferenceRows } from "@/lib/procurement/detail-display";
import { addWorkingDays, fromDateOnlyString, toDateOnlyString } from "@/lib/calendar/working-days";
import { isPriceBidWorkingDay } from "@/lib/procurement/price-bid-date";
import { suggestPriceBidOpenDate } from "@/lib/procurement/suggest-price-bid-date";
import { parseProcurementSettingsSnapshot } from "@/lib/procurement/settings-snapshot";
import { WorkflowStageFields } from "@/components/procurement/workflow-stage-fields";
import { useWorkflowCustomFieldsAll } from "@/lib/procurement/use-workflow-custom-fields";
import { useWorkflowValidationGuards } from "@/lib/procurement/use-workflow-validation-guards";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import {
  useCorrectProcurementStatusMutation,
  useGenerateDocumentMutation,
  useGenerateTechnicalLettersMutation,
  useGetProcurementQuery,
  useRefreshProcurementSettingsMutation,
  useRestartProcurementMutation,
  useSaveProcurementCinNumberMutation,
  useDeleteBidderMutation,
  useSaveBiddersMutation,
  useSetTechnicalResultsMutation,
  useUpdateBidderMutation,
  useTransitionProcurementMutation,
} from "@/store/api/procurementsApi";
import type { ProcurementStatus } from "@prisma/client";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";

type StatusCorrectionAction = "STEP_BACK" | "CANCEL" | "REOPEN_COMPLETED";

export default function ProcurementDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const user = useAppSelector((s) => s.auth.user);
  const canEdit = hasPermission(user, "procurement.edit");
  const canTransition = hasPermission(user, "procurement.transition");
  const isSuperadmin = user?.role === "SUPERADMIN";
  const { data, isLoading, refetch } = useGetProcurementQuery(id);
  const [transition, { isLoading: transitioning }] = useTransitionProcurementMutation();
  const [correctStatus, { isLoading: correctingStatus }] = useCorrectProcurementStatusMutation();
  const [saveCinNumber, { isLoading: savingCinNumber }] = useSaveProcurementCinNumberMutation();
  const [generateDoc] = useGenerateDocumentMutation();
  const [generateTechnicalLetters] = useGenerateTechnicalLettersMutation();
  const [restart] = useRestartProcurementMutation();
  const [refreshSettings, { isLoading: refreshingSettings }] =
    useRefreshProcurementSettingsMutation();
  const [saveBidders] = useSaveBiddersMutation();
  const [updateBidder] = useUpdateBidderMutation();
  const [deleteBidder] = useDeleteBidderMutation();
  const [setResults, { isLoading: savingTechnical }] = useSetTechnicalResultsMutation();
  const wf = useWorkflowCustomFieldsAll(id);

  const [bidderName, setBidderName] = useState("");
  const [bidderAddress, setBidderAddress] = useState("");
  const [bidderPhone, setBidderPhone] = useState("");
  const [bidderResponseDate, setBidderResponseDate] = useState("");
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [generatingLetters, setGeneratingLetters] = useState(false);
  const [prebidAckDate, setPrebidAckDate] = useState("");
  const [bidOpenAckDate, setBidOpenAckDate] = useState("");
  const [editingBidderId, setEditingBidderId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBidResponseDate, setEditBidResponseDate] = useState("");
  const [technicalDraft, setTechnicalDraft] = useState<Record<string, boolean | null>>({});
  const [priceBidOpenDate, setPriceBidOpenDate] = useState("");
  const [loaDocumentDate, setLoaDocumentDate] = useState("");
  const [contractAgreementDate, setContractAgreementDate] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [supplierWitnessName, setSupplierWitnessName] = useState("");
  const [supplierWitnessDesignation, setSupplierWitnessDesignation] = useState("");
  const [supplierSigningAuthorityName, setSupplierSigningAuthorityName] = useState("");
  const [supplierSigningAuthorityDesignation, setSupplierSigningAuthorityDesignation] =
    useState("");
  const [poIssueDate, setPoIssueDate] = useState("");
  const [deliveryReceivedDate, setDeliveryReceivedDate] = useState("");
  const [pdiStartDate, setPdiStartDate] = useState("");
  const [pdiEndDate, setPdiEndDate] = useState("");
  const [pdiMembers, setPdiMembers] = useState<Array<{ name: string; designation: string }>>([
    { name: "", designation: "" },
  ]);
  const [editingCommitteeDecision, setEditingCommitteeDecision] = useState(false);
  const [confirmCorrectionAction, setConfirmCorrectionAction] = useState<StatusCorrectionAction | null>(
    null,
  );

  const proc = data as Record<string, unknown> | undefined;
  const status = proc?.status as ProcurementStatus | undefined;
  const workflowDateValidationEnabled = proc?.workflowDateValidationEnabled !== false;
  const {
    guardTransition,
    guardBidderEntry,
    guardBidderFinalize,
    guardCommitteeDecision,
  } = useWorkflowValidationGuards(proc, status, workflowDateValidationEnabled);
  const bidders = (proc?.bidders as Array<Record<string, unknown>>) ?? [];
  const canGenerateLoiAnytime = [
    "LOI_ISSUED",
    "LOA_ISSUED",
    "CONTRACT_SIGNED",
    "IN_PROGRESS",
    "PDI_PHASE",
    "COMPLETED",
  ].includes(String(status));
  const canGenerateLoaAnytime = [
    "LOA_ISSUED",
    "CONTRACT_SIGNED",
    "IN_PROGRESS",
    "PDI_PHASE",
    "COMPLETED",
  ].includes(String(status));
  const canGenerateNoticeAnytime = status !== "DRAFT";
  const canGenerateContractAnytime = [
    "LOA_ISSUED",
    "CONTRACT_SIGNED",
    "IN_PROGRESS",
    "PDI_PHASE",
    "COMPLETED",
  ].includes(String(status));
  const canGenerateTechnicalLettersAnytime = [
    "TECHNICAL_DONE",
    "LETTERS_SENT",
    "PRICE_BID_OPEN",
    "WITH_FINANCE",
    "WINNER_SELECTED",
    "LOI_ISSUED",
    "LOA_ISSUED",
    "CONTRACT_SIGNED",
    "IN_PROGRESS",
    "PDI_PHASE",
    "COMPLETED",
  ].includes(String(status));

  useEffect(() => {
    if (!proc) return;
    const prebid = proc.prebidDate ? String(proc.prebidDate).slice(0, 10) : "";
    const bidOpen = proc.bidOpenDate ? String(proc.bidOpenDate).slice(0, 10) : "";
    setPrebidAckDate((prev) => prev || prebid || new Date().toISOString().slice(0, 10));
    setBidOpenAckDate((prev) => prev || bidOpen || new Date().toISOString().slice(0, 10));
  }, [proc?.id, proc?.prebidDate, proc?.bidOpenDate]);

  const canManageBidders =
    status === "BID_OPEN_DAY" || status === "BID_CLOSED" || status === "BIDDERS_ENTERED";

  useEffect(() => {
    if (!bidderResponseDate && canManageBidders) {
      setBidderResponseDate(new Date().toISOString().slice(0, 10));
    }
  }, [canManageBidders, bidderResponseDate]);

  const priceBidDays =
    (proc?.bidType as { defaultPriceBidDays?: number } | null | undefined)?.defaultPriceBidDays ??
    7;
  const snapshot = parseProcurementSettingsSnapshot(proc?.settingsSnapshot);
  const calendarContext = snapshot?.calendar;
  const pgSettings = snapshot?.settings ?? {
    pgDiscountThresholdPercent: 15,
    pgLowDiscountRatePercent: 5,
    pgFrontLoadingCostFactor: 0.85,
    pgFrontLoadingRate: 0.5,
  };

  useEffect(() => {
    if (!proc || status !== "LETTERS_SENT") return;
    const stored = proc.priceBidOpenDate ? String(proc.priceBidOpenDate).slice(0, 10) : "";
    if (stored) {
      setPriceBidOpenDate(stored);
      return;
    }
    const suggested = suggestPriceBidOpenDate(proc);
    if (suggested) setPriceBidOpenDate(suggested);
  }, [proc?.id, proc?.priceBidOpenDate, status]);

  useEffect(() => {
    if (!proc || status !== "LOI_ISSUED") return;
    const stored = proc.loaDocumentDate ? String(proc.loaDocumentDate).slice(0, 10) : "";
    if (stored) {
      setLoaDocumentDate(stored);
      return;
    }
    const loi = proc.loiIssuedDate ? String(proc.loiIssuedDate).slice(0, 10) : "";
    if (loi && calendarContext) {
      const delay = snapshot?.settings?.loaDelayDays ?? 7;
      setLoaDocumentDate(
        toDateOnlyString(addWorkingDays(fromDateOnlyString(loi), delay, calendarContext)),
      );
    }
  }, [proc?.id, proc?.loaDocumentDate, proc?.loiIssuedDate, status, calendarContext, snapshot]);

  useEffect(() => {
    if (!proc) return;
    if (proc.contractAgreementDate) {
      setContractAgreementDate(String(proc.contractAgreementDate).slice(0, 10));
    }
    setCinNumber(proc.cinNumber ? String(proc.cinNumber) : "");
    setSupplierWitnessName(proc.supplierWitnessName ? String(proc.supplierWitnessName) : "");
    setSupplierWitnessDesignation(
      proc.supplierWitnessDesignation ? String(proc.supplierWitnessDesignation) : "",
    );
    setSupplierSigningAuthorityName(
      proc.supplierSigningAuthorityName ? String(proc.supplierSigningAuthorityName) : "",
    );
    setSupplierSigningAuthorityDesignation(
      proc.supplierSigningAuthorityDesignation
        ? String(proc.supplierSigningAuthorityDesignation)
        : "",
    );
    if (proc.poIssueDate) setPoIssueDate(String(proc.poIssueDate).slice(0, 10));
    setDeliveryReceivedDate(
      proc.deliveryReceivedDate
        ? String(proc.deliveryReceivedDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    if (proc.pdiDate) setPdiStartDate(String(proc.pdiDate).slice(0, 10));
    if (proc.pdiEndDate) setPdiEndDate(String(proc.pdiEndDate).slice(0, 10));
    const savedMembers = (proc.pdiMembers as Array<{ name?: string; designation?: string }> | undefined)
      ?.map((m) => ({ name: String(m.name ?? ""), designation: String(m.designation ?? "") }))
      .filter((m) => m.name || m.designation);
    setPdiMembers(savedMembers && savedMembers.length > 0 ? savedMembers : [{ name: "", designation: "" }]);
  }, [
    proc?.id,
    proc?.contractAgreementDate,
    proc?.cinNumber,
    proc?.supplierWitnessName,
    proc?.supplierWitnessDesignation,
    proc?.supplierSigningAuthorityName,
    proc?.supplierSigningAuthorityDesignation,
    proc?.poIssueDate,
    proc?.deliveryReceivedDate,
    proc?.pdiDate,
    proc?.pdiEndDate,
    proc?.pdiMembers,
  ]);

  useEffect(() => {
    if (status !== "TECHNICAL_EVAL") return;
    setTechnicalDraft((prev) => {
      const next = { ...prev };
      for (const b of bidders) {
        const bidderId = String(b.id);
        if (next[bidderId] === undefined) {
          next[bidderId] =
            b.passedTech === true || b.passedTech === false ? (b.passedTech as boolean) : null;
        }
      }
      return next;
    });
  }, [status, bidders]);

  async function doTransition(toStatus: string, payload?: Record<string, unknown>) {
    const blocked = guardTransition(toStatus as ProcurementStatus, payload);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    try {
      await transition({ id, status: toStatus, payload }).unwrap();
      toast.success("Status updated");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Transition failed"));
    }
  }

  async function runStageAction(stageKey: string, action: () => Promise<void>) {
    try {
      const err = wf.validateStage(stageKey);
      if (err) {
        toast.error(err);
        return;
      }
      await wf.persistStage(stageKey);
      await action();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Action failed"));
    }
  }

  async function runStatusCorrection(action: StatusCorrectionAction) {
    try {
      await correctStatus({ id, action }).unwrap();
      toast.success("Status corrected");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Status correction failed"));
    }
  }

  const correctionCopy: Record<StatusCorrectionAction, { title: string; message: string }> = {
    STEP_BACK: {
      title: "Move back one step?",
      message:
        "This will move the procurement to its immediate previous status. Use only for correction.",
    },
    CANCEL: {
      title: "Cancel procurement?",
      message: "This will set the procurement status to Cancelled.",
    },
    REOPEN_COMPLETED: {
      title: "Reopen completed procurement?",
      message: "This will move the procurement back to In Progress.",
    },
  };

  function startEditBidder(bidder: Record<string, unknown>) {
    setEditingBidderId(String(bidder.id));
    setEditName(String(bidder.name));
    setEditAddress(String(bidder.address));
    setEditPhone(bidder.phone ? String(bidder.phone) : "");
    setEditBidResponseDate(
      bidder.bidResponseDate ? String(bidder.bidResponseDate).slice(0, 10) : "",
    );
  }

  function cancelEditBidder() {
    setEditingBidderId(null);
    setEditName("");
    setEditAddress("");
    setEditPhone("");
    setEditBidResponseDate("");
  }

  async function saveEditBidder() {
    if (!editingBidderId || !editName.trim() || !editAddress.trim()) {
      toast.error("Name and address required");
      return;
    }
    if (!editBidResponseDate) {
      toast.error("Bid response date is required");
      return;
    }
    try {
      await updateBidder({
        procurementId: id,
        bidderId: editingBidderId,
        name: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim() || null,
        bidResponseDate: editBidResponseDate,
      }).unwrap();
      toast.success("Bidder updated");
      cancelEditBidder();
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update bidder"));
    }
  }

  async function removeBidder(bidderId: string, name: string) {
    if (!window.confirm(`Remove bidder "${name}"?`)) return;
    try {
      await deleteBidder({ procurementId: id, bidderId }).unwrap();
      toast.success("Bidder removed");
      if (editingBidderId === bidderId) cancelEditBidder();
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove bidder"));
    }
  }

  function validatePriceBidDateInput(date: string): boolean {
    if (!date) {
      toast.error("Select a price bid opening date");
      return false;
    }
    if (calendarContext && !isPriceBidWorkingDay(date, calendarContext)) {
      toast.error("Price bid opening must be a working day (not a weekend or public holiday)");
      return false;
    }
    return true;
  }

  async function openPriceBid() {
    if (!validatePriceBidDateInput(priceBidOpenDate)) return;
    await doTransition("PRICE_BID_OPEN", { priceBidOpenDate });
  }

  async function sendToEvaluationCommittee() {
    await doTransition("WITH_FINANCE", {
      evaluationCommitteeSentDate: new Date().toISOString().slice(0, 10),
    });
  }

  async function issueLoa() {
    if (!loaDocumentDate) {
      toast.error("Select LOA document date");
      return;
    }
    await doTransition("LOA_ISSUED", { loaDocumentDate });
  }

  async function signContract() {
    if (!contractAgreementDate) {
      toast.error("Select contract agreement date");
      return;
    }
    if (!cinNumber.trim()) {
      toast.error("Enter CIN number before issuing contract");
      return;
    }
    if (
      !supplierWitnessName.trim() ||
      !supplierWitnessDesignation.trim() ||
      !supplierSigningAuthorityName.trim() ||
      !supplierSigningAuthorityDesignation.trim()
    ) {
      toast.error("Enter supplier witness and signing authority details");
      return;
    }
    await doTransition("CONTRACT_SIGNED", {
      contractAgreementDate,
      cinNumber: cinNumber.trim(),
      supplierWitnessName: supplierWitnessName.trim(),
      supplierWitnessDesignation: supplierWitnessDesignation.trim(),
      supplierSigningAuthorityName: supplierSigningAuthorityName.trim(),
      supplierSigningAuthorityDesignation: supplierSigningAuthorityDesignation.trim(),
    });
  }

  async function savePreContractDetails() {
    const value = cinNumber.trim();
    if (!value) {
      toast.error("Enter CIN number");
      return false;
    }
    if (
      !supplierWitnessName.trim() ||
      !supplierWitnessDesignation.trim() ||
      !supplierSigningAuthorityName.trim() ||
      !supplierSigningAuthorityDesignation.trim()
    ) {
      toast.error("Enter supplier witness and signing authority details");
      return false;
    }
    try {
      const err = wf.validateStage("LOA_ISSUED");
      if (err) {
        toast.error(err);
        return false;
      }
      await wf.persistStage("LOA_ISSUED");

      await saveCinNumber({
        id,
        cinNumber: value,
        supplierWitnessName: supplierWitnessName.trim(),
        supplierWitnessDesignation: supplierWitnessDesignation.trim(),
        supplierSigningAuthorityName: supplierSigningAuthorityName.trim(),
        supplierSigningAuthorityDesignation: supplierSigningAuthorityDesignation.trim(),
      }).unwrap();
      toast.success("Pre-contract details saved");
      refetch();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save pre-contract details"));
      return false;
    }
  }

  async function issuePo() {
    if (!poIssueDate) {
      toast.error("Select PO issue date");
      return;
    }
    await doTransition("IN_PROGRESS", { poIssueDate });
  }

  async function completeProcurement() {
    if (!deliveryReceivedDate) {
      toast.error("Select final delivery date");
      return;
    }
    await doTransition("COMPLETED", { deliveryReceivedDate });
  }

  async function startPdi() {
    if (!pdiStartDate) {
      toast.error("Select PDI start date");
      return;
    }
    const members = pdiMembers
      .map((m) => ({ name: m.name.trim(), designation: m.designation.trim() }))
      .filter((m) => m.name && m.designation);
    if (members.length === 0) {
      toast.error("Add at least one PDI member with name and designation");
      return;
    }
    await doTransition("PDI_PHASE", { pdiDate: pdiStartDate, pdiMembers: members });
  }

  async function completePdi() {
    if (!pdiEndDate) {
      toast.error("Select PDI end date");
      return;
    }
    await doTransition("IN_PROGRESS", { pdiEndDate });
  }

  async function completeTechnicalEvaluation() {
    const unset = bidders.filter((b) => {
      const result = technicalDraft[String(b.id)];
      return result !== true && result !== false;
    });
    if (unset.length > 0) {
      toast.error("Select pass or fail for every bidder");
      return;
    }

    try {
      await setResults({
        id,
        results: bidders.map((b) => ({
          bidderId: String(b.id),
          passed: technicalDraft[String(b.id)]!,
        })),
      }).unwrap();
      toast.success("Technical evaluation completed");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save technical results"));
    }
  }

  async function addBidder(finalize = false) {
    const blocked = finalize ? guardBidderFinalize() : guardBidderEntry();
    if (blocked) {
      toast.error(blocked);
      return;
    }

    const newBidder =
      bidderName.trim() && bidderAddress.trim()
        ? {
            name: bidderName.trim(),
            address: bidderAddress.trim(),
            phone: bidderPhone || null,
            bidResponseDate: bidderResponseDate,
          }
        : null;

    if (!finalize && !newBidder) {
      toast.error("Name and address required");
      return;
    }
    if (newBidder && !bidderResponseDate) {
      toast.error("Bid response date is required");
      return;
    }
    if (finalize && !newBidder && bidders.length === 0) {
      toast.error("Add at least one bidder before finishing");
      return;
    }

    try {
      const err = wf.validateStage("bidder_entry");
      if (err) {
        toast.error(err);
        return;
      }
      await wf.persistStage("bidder_entry");

      const existing = bidders.map((b) => ({
        name: String(b.name),
        address: String(b.address),
        phone: b.phone ? String(b.phone) : null,
        bidResponseDate: b.bidResponseDate
          ? String(b.bidResponseDate).slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      }));

      await saveBidders({
        id,
        bidders: finalize
          ? newBidder
            ? [...existing, newBidder]
            : existing
          : [newBidder!],
        finalize,
        replaceAll: finalize,
      }).unwrap();

      setBidderName("");
      setBidderAddress("");
      setBidderPhone("");
      toast.success(finalize ? "Bidders recorded" : "Bidder added");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save bidders"));
    }
  }

  async function downloadNotice() {
    try {
      const result = await generateDoc({ id, type: "notice" }).unwrap();
      openDownloadUrl(result.downloadUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate document"));
    }
  }

  async function generateLoiAndRejectionLetters() {
    const technicalBidders = bidders.map((b) => ({
      id: String(b.id),
      passedTech: b.passedTech as boolean | null | undefined,
    }));
    const counts = countTechnicalLetterGenerations(technicalBidders);

    if (counts.total === 0) {
      toast.error("Set technical pass/fail results for every bidder before generating letters");
      return;
    }

    try {
      setGeneratingLetters(true);
      const result = await generateTechnicalLetters(id).unwrap();
      const zipName = `technical-letters-${proc?.referenceNo ?? id}.zip`;
      openDownloadUrl(result.downloadUrl, zipName);
      toast.success(
        `${result.counts.total} letters generated (${result.counts.passed} LOI, ${result.counts.failed} rejection)`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate letters"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  async function generateWinnerLoi() {
    const winner = bidders.find((b) => b.isWinner);
    if (!winner) return;
    try {
      setGeneratingLetters(true);
      const result = await generateDoc({
        id,
        type: "loi-winner",
        bidderId: String(winner.id),
      }).unwrap();
      openDownloadUrl(result.downloadUrl);
      toast.success("Winner LOI generated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate winner LOI"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  async function issueLoi() {
    const winner = bidders.find((b) => b.isWinner);
    if (!winner) {
      toast.error("Select a winner before issuing LOI");
      return;
    }
    try {
      setGeneratingLetters(true);
      const result = await generateDoc({
        id,
        type: "loi-winner",
        bidderId: String(winner.id),
      }).unwrap();
      openDownloadUrl(result.downloadUrl);
      toast.success("Winner LOI generated");
      await doTransition("LOI_ISSUED");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate winner LOI"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  async function generateLoaDocument() {
    try {
      setGeneratingLetters(true);
      const result = await generateDoc({ id, type: "loa" }).unwrap();
      openDownloadUrl(result.downloadUrl);
      toast.success("LOA generated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate LOA"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  async function generateNoticeDocument() {
    try {
      setGeneratingLetters(true);
      const result = await generateDoc({ id, type: "notice" }).unwrap();
      openDownloadUrl(result.downloadUrl);
      toast.success("Notice generated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate notice"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  async function generateContractDocument() {
    try {
      setGeneratingLetters(true);
      const saved = await savePreContractDetails();
      if (!saved) return;
      const result = await generateDoc({ id, type: "contract" }).unwrap();
      openDownloadUrl(result.downloadUrl);
      toast.success("Contract generated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate contract"));
    } finally {
      setGeneratingLetters(false);
    }
  }

  if (isLoading || !proc) {
    return (
      <AppShell title="Procurement">
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell title={String(proc.title)}>
      <Card padding="default" className="!shadow-[var(--shadow-sm)] hover:!shadow-[var(--shadow-sm)]">
        <CardHeader className="mb-0 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{STATUS_LABELS[status!] ?? status}</Badge>
            </div>
            <CardDescription className="mt-1">
              Workflow actions and document generation
            </CardDescription>
          </div>
        </CardHeader>
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <ProcurementCrudActions
          id={id}
          title={String(proc.title)}
          layout="buttons"
        />
        {canEdit && (
        <Button
          variant="secondary"
          disabled={refreshingSettings}
          onClick={async () => {
            const confirmed = window.confirm(
              "Recalculate dates and amounts using current system settings and calendar? This replaces the saved rules snapshot for this procurement.",
            );
            if (!confirmed) return;
            try {
              await refreshSettings(id).unwrap();
              toast.success("Recalculated with current settings");
              refetch();
            } catch {
              toast.error("Failed to refresh settings");
            }
          }}
        >
          Refresh with current settings
        </Button>
        )}
        {proc.settingsSnapshotAt ? (
          <span className="text-xs text-[var(--color-text-soft)]">
            Rules saved: {new Date(String(proc.settingsSnapshotAt)).toLocaleString()}
          </span>
        ) : null}
        {canTransition && status === "DRAFT" && (
          <Button
            onClick={() => doTransition("ACTIVE")}
            disabled={transitioning || Boolean(guardTransition("ACTIVE"))}
            title={guardTransition("ACTIVE") ?? undefined}
          >
            Begin procurement period
          </Button>
        )}
        {canTransition && status === "ACTIVE" && (
          <>
            <Button variant="secondary" onClick={generateNoticeDocument} disabled={generatingLetters}>
              {generatingLetters ? "Generating…" : "Download notice"}
            </Button>
          </>
        )}
        {canTransition && status === "BID_OPEN_DAY" && (
          <Button
            variant="secondary"
            onClick={() => doTransition("BID_CLOSED")}
            disabled={transitioning || Boolean(guardTransition("BID_CLOSED"))}
            title={guardTransition("BID_CLOSED") ?? undefined}
          >
            Close bid (ready for bidders)
          </Button>
        )}
        {canTransition && status === "BID_CLOSED" && (
          <Button variant="danger" onClick={() => doTransition("NO_BIDDERS")} disabled={transitioning}>
            No bidders
          </Button>
        )}
        {canTransition && status === "NO_BIDDERS" && (
          <Button
            onClick={async () => {
              await restart(id).unwrap();
              toast.success("Bid restarted");
              refetch();
            }}
          >
            Restart bid
          </Button>
        )}
        {canTransition && status === "BIDDERS_ENTERED" && (
          <Button onClick={() => doTransition("TECHNICAL_EVAL", { technicalEvalSentDate: new Date().toISOString().slice(0, 10) })}>
            Send for technical evaluation
          </Button>
        )}
        {canTransition && status === "TECHNICAL_DONE" && (
          <Button onClick={() => doTransition("LETTERS_SENT")}>Letters sent</Button>
        )}
        {canTransition && status === "PRICE_BID_OPEN" && (
          <Button onClick={sendToEvaluationCommittee}>Send to evaluation committee</Button>
        )}
        {canTransition && status === "WINNER_SELECTED" && (
          <Button onClick={issueLoi} disabled={generatingLetters || transitioning}>
            {generatingLetters ? "Issuing…" : "Issue LOI"}
          </Button>
        )}
        {canTransition && canGenerateLoiAnytime && (
          <Button
            variant="secondary"
            onClick={generateWinnerLoi}
            disabled={generatingLetters}
          >
            {generatingLetters ? "Generating…" : "Generate LOI"}
          </Button>
        )}
        {canTransition && canGenerateLoaAnytime && (
          <Button
            variant="secondary"
            onClick={generateLoaDocument}
            disabled={generatingLetters}
          >
            {generatingLetters ? "Generating…" : "Generate LOA"}
          </Button>
        )}
        {canTransition && canGenerateNoticeAnytime && (
          <Button variant="secondary" onClick={generateNoticeDocument} disabled={generatingLetters}>
            {generatingLetters ? "Generating…" : "Generate notice"}
          </Button>
        )}
        {canTransition && canGenerateContractAnytime && (
          <Button
            variant="secondary"
            onClick={generateContractDocument}
            disabled={generatingLetters}
          >
            {generatingLetters ? "Generating…" : "Generate contract"}
          </Button>
        )}
        {canTransition && canGenerateTechnicalLettersAnytime && (
          <Button
            variant="secondary"
            onClick={generateLoiAndRejectionLetters}
            disabled={generatingLetters}
          >
            {generatingLetters ? "Generating…" : "Generate technical letters"}
          </Button>
        )}
        </div>
      </Card>

      {isSuperadmin && status && (
        <>
          <WorkflowDateValidationToggle onChanged={() => refetch()} />
        <Card className="mb-6 border-orange-300/70">
          <CardTitle>Superadmin status correction</CardTitle>
          <CardDescription>
            Emergency-only controls. These actions bypass normal forward workflow.
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmCorrectionAction("STEP_BACK")}
              disabled={
                correctingStatus || status === "DRAFT" || status === "CANCELLED" || status === "COMPLETED"
              }
            >
              Move back one step
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmCorrectionAction("CANCEL")}
              disabled={correctingStatus || status === "CANCELLED" || status === "COMPLETED"}
            >
              Cancel procurement
            </Button>
            <Button
              onClick={() => setConfirmCorrectionAction("REOPEN_COMPLETED")}
              disabled={correctingStatus || status !== "COMPLETED"}
            >
              Reopen completed
            </Button>
          </div>
        </Card>
        </>
      )}

      {confirmCorrectionAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-md">
            <CardTitle>{correctionCopy[confirmCorrectionAction].title}</CardTitle>
            <p className="mt-2 text-sm text-[var(--color-text-soft)]">
              {correctionCopy[confirmCorrectionAction].message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirmCorrectionAction(null)}
                disabled={correctingStatus}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmCorrectionAction === "CANCEL" ? "danger" : "primary"}
                onClick={async () => {
                  const action = confirmCorrectionAction;
                  setConfirmCorrectionAction(null);
                  await runStatusCorrection(action);
                }}
                disabled={correctingStatus}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}


      <div>
        <Button variant="secondary" type="button" onClick={() => setShowFullDetails(true)}>
          View full details
        </Button>
      </div>

      <ProcurementFullDetails
        procurement={proc}
        open={showFullDetails}
        onClose={() => setShowFullDetails(false)}
      />

      {canTransition && status === "ACTIVE" && (
        <Card className="mb-6">
          <CardTitle>Record pre-bid meeting</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Select the date the pre-bid was held (defaults to scheduled pre-bid date).
          </p>
          {guardTransition("PREBID_OPEN", { prebidAcknowledgedAt: prebidAckDate }) ? (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {guardTransition("PREBID_OPEN", { prebidAcknowledgedAt: prebidAckDate })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="ACTIVE"
              customFields={wf.getFieldsForStage("ACTIVE")}
              fieldOrder={wf.getFieldOrderForStage("ACTIVE")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                prebidAcknowledgedAt: (
                  <Input
                    label="Pre-bid date"
                    type="date"
                    value={prebidAckDate}
                    onChange={(e) => setPrebidAckDate(e.target.value)}
                  />
                ),
              }}
            />
            <Button
              disabled={
                transitioning ||
                !prebidAckDate ||
                Boolean(guardTransition("PREBID_OPEN", { prebidAcknowledgedAt: prebidAckDate }))
              }
              onClick={() =>
                runStageAction("ACTIVE", () =>
                  doTransition("PREBID_OPEN", { prebidAcknowledgedAt: prebidAckDate }),
                )
              }
            >
              Confirm pre-bid
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "LETTERS_SENT" && (
        <Card className="mb-6">
          <CardTitle>Open price bid</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Suggested opening date: today plus {priceBidDays} working day
            {priceBidDays === 1 ? "" : "s"} for this bid type. Adjust if needed, then open.
          </p>
          {guardTransition("PRICE_BID_OPEN", { priceBidOpenDate }) ? (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {guardTransition("PRICE_BID_OPEN", { priceBidOpenDate })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="LETTERS_SENT"
              customFields={wf.getFieldsForStage("LETTERS_SENT")}
              fieldOrder={wf.getFieldOrderForStage("LETTERS_SENT")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                priceBidOpenDate: (
                  <div>
                    <Input
                      label="Price bid opening date"
                      type="date"
                      value={priceBidOpenDate}
                      onChange={(e) => setPriceBidOpenDate(e.target.value)}
                    />
                    <DateBsHint value={priceBidOpenDate} />
                  </div>
                ),
              }}
            />
            <Button
              disabled={
                transitioning ||
                !priceBidOpenDate ||
                Boolean(guardTransition("PRICE_BID_OPEN", { priceBidOpenDate }))
              }
              onClick={() => runStageAction("LETTERS_SENT", openPriceBid)}
            >
              Open price bid
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "WITH_FINANCE" && (
        <CommitteeDecisionPanel
          procurementId={id}
          costEstimate={Number(proc.costEstimate)}
          bidders={bidders.map((b) => ({
            id: String(b.id),
            name: String(b.name),
            passedTech: b.passedTech as boolean | null | undefined,
          }))}
          workflowCustomFields={wf.getFieldsForStage("committee_decision")}
          workflowFieldOrder={wf.getFieldOrderForStage("committee_decision")}
          workflowValues={wf.values}
          onWorkflowValueChange={wf.setValue}
          onBeforeSave={async () => {
            const blocked = guardCommitteeDecision();
            if (blocked) {
              throw new Error(blocked);
            }
            await wf.persistStage("committee_decision");
          }}
          pgSettings={{
            pgDiscountThresholdPercent: pgSettings.pgDiscountThresholdPercent,
            pgLowDiscountRatePercent: pgSettings.pgLowDiscountRatePercent,
            pgFrontLoadingCostFactor: pgSettings.pgFrontLoadingCostFactor,
            pgFrontLoadingRate: pgSettings.pgFrontLoadingRate,
          }}
          onSaved={() => refetch()}
        />
      )}

      {canTransition && status === "WINNER_SELECTED" && editingCommitteeDecision && (
        <CommitteeDecisionPanel
          procurementId={id}
          costEstimate={Number(proc.costEstimate)}
          bidders={bidders.map((b) => ({
            id: String(b.id),
            name: String(b.name),
            passedTech: b.passedTech as boolean | null | undefined,
          }))}
          workflowCustomFields={wf.getFieldsForStage("committee_decision")}
          workflowFieldOrder={wf.getFieldOrderForStage("committee_decision")}
          workflowValues={wf.values}
          onWorkflowValueChange={wf.setValue}
          onBeforeSave={async () => {
            const blocked = guardCommitteeDecision();
            if (blocked) {
              throw new Error(blocked);
            }
            await wf.persistStage("committee_decision");
          }}
          initialDecision={{
            winnerBidderId: (proc.winnerBidder as { id?: string } | null)?.id ?? null,
            bidCurrencyId: (proc.winnerBidder as { bidCurrencyId?: string } | null)?.bidCurrencyId ?? null,
            paymentConditionId:
              (proc.winnerBidder as { paymentConditionId?: string } | null)?.paymentConditionId ??
              null,
            bidAmountWithoutVatLines: (
              (proc.winnerBidder as { bidAmountLines?: Array<{
                amountKind: string;
                currencyId: string | null;
                amount: number;
                forexRate: number | null;
              }> } | null)?.bidAmountLines ?? []
            )
              .filter((line) => line.amountKind === "WITHOUT_VAT")
              .map((line) => ({
                currencyId: line.currencyId,
                amount: line.amount,
                forexRate: line.forexRate,
              })),
            bidAmountWithVatLines: (
              (proc.winnerBidder as { bidAmountLines?: Array<{
                amountKind: string;
                currencyId: string | null;
                amount: number;
                forexRate: number | null;
              }> } | null)?.bidAmountLines ?? []
            )
              .filter((line) => line.amountKind === "WITH_VAT")
              .map((line) => ({
                currencyId: line.currencyId,
                amount: line.amount,
                forexRate: line.forexRate,
              })),
            bidAmountWithVat:
              (proc.winnerBidder as { bidAmountWithVat?: number } | null)?.bidAmountWithVat ?? null,
            bidAmountWithoutVat:
              (proc.winnerBidder as { bidAmountWithoutVat?: number } | null)?.bidAmountWithoutVat ??
              null,
            warrantyDays: (proc.warrantyDays as number | null) ?? null,
            workDays: ((proc.workDays as Array<{ workDayCategoryId: string; days: number }>) ?? []).map(
              (w) => ({ workDayCategoryId: w.workDayCategoryId, days: w.days }),
            ),
          }}
          submitLabel="Save edits"
          pgSettings={{
            pgDiscountThresholdPercent: pgSettings.pgDiscountThresholdPercent,
            pgLowDiscountRatePercent: pgSettings.pgLowDiscountRatePercent,
            pgFrontLoadingCostFactor: pgSettings.pgFrontLoadingCostFactor,
            pgFrontLoadingRate: pgSettings.pgFrontLoadingRate,
          }}
          onSaved={() => {
            setEditingCommitteeDecision(false);
            refetch();
          }}
        />
      )}

      {canTransition && status === "WINNER_SELECTED" && (
        <Card className="mb-6">
          <CardTitle>Winner LOI</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Generate the winner LOI (CC includes other technically passed bidders), then issue LOI.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            disabled={generatingLetters}
            onClick={generateWinnerLoi}
          >
            {generatingLetters ? "Generating…" : "Generate winner LOI"}
          </Button>
        </Card>
      )}

      {canTransition && status === "LOI_ISSUED" && (
        <Card className="mb-6">
          <CardTitle>Issue LOA</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            LOA is issued 7 working days after LOI. Select the LOA document date (PG validity is
            calculated from work days, warranty, and extension days).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="LOI_ISSUED"
              customFields={wf.getFieldsForStage("LOI_ISSUED")}
              fieldOrder={wf.getFieldOrderForStage("LOI_ISSUED")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                loaDocumentDate: (
                  <div>
                    <Input
                      label="LOA document date"
                      type="date"
                      value={loaDocumentDate}
                      onChange={(e) => setLoaDocumentDate(e.target.value)}
                    />
                    <DateBsHint value={loaDocumentDate} />
                  </div>
                ),
              }}
            />
            <Button variant="secondary" disabled={generatingLetters} onClick={generateLoaDocument}>
              {generatingLetters ? "Generating…" : "Generate LOA"}
            </Button>
            <Button disabled={transitioning || !loaDocumentDate} onClick={() => runStageAction("LOI_ISSUED", issueLoa)}>
              Issue LOA
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "LOA_ISSUED" && (
        <Card className="mb-6">
          <CardTitle>Contract agreement</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Enter supplier witness and signing authority details before generating and issuing the
            contract.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="LOA_ISSUED"
              customFields={wf.getFieldsForStage("LOA_ISSUED")}
              fieldOrder={wf.getFieldOrderForStage("LOA_ISSUED")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                cinNumber: (
                  <Input
                    label="CIN number"
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                    placeholder="Enter CIN number"
                  />
                ),
                supplierWitnessName: (
                  <Input
                    label="Supplier witness name"
                    value={supplierWitnessName}
                    onChange={(e) => setSupplierWitnessName(e.target.value)}
                  />
                ),
                supplierWitnessDesignation: (
                  <Input
                    label="Supplier witness designation"
                    value={supplierWitnessDesignation}
                    onChange={(e) => setSupplierWitnessDesignation(e.target.value)}
                  />
                ),
                supplierSigningAuthorityName: (
                  <Input
                    label="Supplier signing authority name"
                    value={supplierSigningAuthorityName}
                    onChange={(e) => setSupplierSigningAuthorityName(e.target.value)}
                  />
                ),
                supplierSigningAuthorityDesignation: (
                  <Input
                    label="Supplier signing authority designation"
                    value={supplierSigningAuthorityDesignation}
                    onChange={(e) => setSupplierSigningAuthorityDesignation(e.target.value)}
                  />
                ),
                contractAgreementDate: (
                  <div>
                    <Input
                      label="Contract agreement date"
                      type="date"
                      value={contractAgreementDate}
                      onChange={(e) => setContractAgreementDate(e.target.value)}
                    />
                    <DateBsHint value={contractAgreementDate} />
                  </div>
                ),
              }}
            />
            <Button
              variant="secondary"
              type="button"
              disabled={
                savingCinNumber ||
                !cinNumber.trim() ||
                !supplierWitnessName.trim() ||
                !supplierWitnessDesignation.trim() ||
                !supplierSigningAuthorityName.trim() ||
                !supplierSigningAuthorityDesignation.trim()
              }
              onClick={savePreContractDetails}
            >
              Save pre-contract details
            </Button>
            <Button
              variant="secondary"
              disabled={
                generatingLetters ||
                !cinNumber.trim() ||
                !supplierWitnessName.trim() ||
                !supplierWitnessDesignation.trim() ||
                !supplierSigningAuthorityName.trim() ||
                !supplierSigningAuthorityDesignation.trim()
              }
              onClick={generateContractDocument}
            >
              Generate contract
            </Button>
            <Button disabled={transitioning || !contractAgreementDate} onClick={() => runStageAction("LOA_ISSUED", signContract)}>
              Record contract agreement
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "CONTRACT_SIGNED" && (
        <Card className="mb-6">
          <CardTitle>Issue purchase order</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Work countdown starts from the PO issue date.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="CONTRACT_SIGNED"
              customFields={wf.getFieldsForStage("CONTRACT_SIGNED")}
              fieldOrder={wf.getFieldOrderForStage("CONTRACT_SIGNED")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                poIssueDate: (
                  <div>
                    <Input
                      label="PO issue date"
                      type="date"
                      value={poIssueDate}
                      onChange={(e) => setPoIssueDate(e.target.value)}
                    />
                    <DateBsHint value={poIssueDate} />
                  </div>
                ),
              }}
            />
            <Button disabled={transitioning || !poIssueDate} onClick={() => runStageAction("CONTRACT_SIGNED", issuePo)}>
              Issue PO &amp; start work
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "IN_PROGRESS" && !proc.pdiEndDate && (
        <Card className="mb-6">
          <CardTitle>PDI (pause work countdown)</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Enter PDI team members (name and designation), then begin PDI.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="IN_PROGRESS_PDI"
              customFields={wf.getFieldsForStage("IN_PROGRESS_PDI")}
              fieldOrder={wf.getFieldOrderForStage("IN_PROGRESS_PDI")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                pdiDate: (
                  <Input
                    label="PDI start date"
                    type="date"
                    value={pdiStartDate}
                    onChange={(e) => setPdiStartDate(e.target.value)}
                  />
                ),
                pdiMemberName: (
                  <div className="w-full space-y-3">
                    {pdiMembers.map((member, idx) => (
                      <div key={`pdi-member-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                          label={idx === 0 ? "PDI member name" : undefined}
                          value={member.name}
                          onChange={(e) =>
                            setPdiMembers((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, name: e.target.value } : row,
                              ),
                            )
                          }
                        />
                        <Input
                          label={idx === 0 ? "Designation" : undefined}
                          value={member.designation}
                          onChange={(e) =>
                            setPdiMembers((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, designation: e.target.value } : row,
                              ),
                            )
                          }
                        />
                        <Button
                          className="self-end"
                          size="sm"
                          variant="danger"
                          disabled={pdiMembers.length === 1}
                          onClick={() =>
                            setPdiMembers((prev) =>
                              prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPdiMembers((prev) => [...prev, { name: "", designation: "" }])
                      }
                    >
                      Add PDI member
                    </Button>
                  </div>
                ),
                pdiMemberDesignation: null,
              }}
            />
            <Button disabled={transitioning || !pdiStartDate} onClick={() => runStageAction("IN_PROGRESS_PDI", startPdi)}>
              Begin PDI
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "IN_PROGRESS" && (
        <Card className="mb-6">
          <CardTitle>Complete procurement</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Record the final delivery date when work is completed.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="IN_PROGRESS_COMPLETE"
              customFields={wf.getFieldsForStage("IN_PROGRESS_COMPLETE")}
              fieldOrder={wf.getFieldOrderForStage("IN_PROGRESS_COMPLETE")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                deliveryReceivedDate: (
                  <div>
                    <Input
                      label="Final delivery date"
                      type="date"
                      value={deliveryReceivedDate}
                      onChange={(e) => setDeliveryReceivedDate(e.target.value)}
                    />
                    <DateBsHint value={deliveryReceivedDate} />
                  </div>
                ),
              }}
            />
            <Button disabled={transitioning || !deliveryReceivedDate} onClick={() => runStageAction("IN_PROGRESS_COMPLETE", completeProcurement)}>
              Mark completed
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "PDI_PHASE" && (
        <Card className="mb-6">
          <CardTitle>Complete PDI</CardTitle>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="PDI_PHASE"
              customFields={wf.getFieldsForStage("PDI_PHASE")}
              fieldOrder={wf.getFieldOrderForStage("PDI_PHASE")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                pdiEndDate: (
                  <Input
                    label="PDI end date"
                    type="date"
                    value={pdiEndDate}
                    onChange={(e) => setPdiEndDate(e.target.value)}
                  />
                ),
              }}
            />
            <Button disabled={transitioning || !pdiEndDate} onClick={() => runStageAction("PDI_PHASE", completePdi)}>
              Complete PDI &amp; resume work
            </Button>
          </div>
        </Card>
      )}

      {canTransition && status === "PREBID_OPEN" && (
        <Card className="mb-6">
          <CardTitle>Record bid opening</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            Select the date bids were opened (defaults to scheduled bid open date).
          </p>
          {guardTransition("BID_OPEN_DAY", { bidOpenAcknowledgedAt: bidOpenAckDate }) ? (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {guardTransition("BID_OPEN_DAY", { bidOpenAcknowledgedAt: bidOpenAckDate })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <WorkflowStageFields
              stageKey="PREBID_OPEN"
              customFields={wf.getFieldsForStage("PREBID_OPEN")}
              fieldOrder={wf.getFieldOrderForStage("PREBID_OPEN")}
              values={wf.values}
              onValueChange={wf.setValue}
              builtinRenderers={{
                bidOpenDate: (
                  <Input
                    label="Bid open date"
                    type="date"
                    value={bidOpenAckDate}
                    onChange={(e) => setBidOpenAckDate(e.target.value)}
                  />
                ),
              }}
            />
            <Button
              disabled={
                transitioning ||
                !bidOpenAckDate ||
                Boolean(guardTransition("BID_OPEN_DAY", { bidOpenAcknowledgedAt: bidOpenAckDate }))
              }
              onClick={() =>
                runStageAction("PREBID_OPEN", () =>
                  doTransition("BID_OPEN_DAY", { bidOpenAcknowledgedAt: bidOpenAckDate }),
                )
              }
            >
              Confirm bid open
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Summary</CardTitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Item</dt>
              <dd>{String(proc.itemName)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Type of bid</dt>
              <dd>
                {(proc.bidType as { name?: string } | null)?.name ?? "—"}
              </dd>
            </div>
            {buildSummaryReferenceRows(proc).map((row) => (
              <div key={`ref-${row.label}`} className="flex justify-between gap-4">
                <dt className="shrink-0 text-[var(--color-text-soft)]">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Cost estimate</dt>
              <dd>{formatCurrency(proc.costEstimate as number)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Bid fee</dt>
              <dd>{formatCurrency(proc.bidFee as number)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Bid security</dt>
              <dd>{formatCurrency(proc.bidSecurity as number)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Grand total (with VAT)</dt>
              <dd>{formatCurrency(proc.grandTotalWithVat as number)}</dd>
            </div>
            {buildSummaryAwardRows(proc).map((row) => (
              <div key={`award-${row.label}`} className="flex justify-between gap-4">
                <dt className="shrink-0 text-[var(--color-text-soft)]">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <ProcurementTimeline procurement={proc} />
      </div>

      {canTransition && canManageBidders && (
        <Card className="mt-6">
          <CardTitle>Bidders</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            {status === "BID_OPEN_DAY"
              ? "After bid opening time, add bidders here or use “Close bid” above first."
              : status === "BID_CLOSED"
                ? "Add each bidder, then finish when the list is complete."
                : "You can add more bidders or proceed to technical evaluation."}
          </p>
          <WorkflowStageFields
            stageKey="bidder_entry"
            customFields={wf.getFieldsForStage("bidder_entry")}
            fieldOrder={wf.getFieldOrderForStage("bidder_entry")}
            values={wf.values}
            onValueChange={wf.setValue}
            className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            builtinRenderers={{
              name: (
                <Input label="Name" value={bidderName} onChange={(e) => setBidderName(e.target.value)} />
              ),
              address: (
                <Input label="Address" value={bidderAddress} onChange={(e) => setBidderAddress(e.target.value)} />
              ),
              phone: (
                <Input label="Phone" value={bidderPhone} onChange={(e) => setBidderPhone(e.target.value)} />
              ),
              bidResponseDate: (
                <div>
                  <Input
                    label="Bid response date"
                    type="date"
                    value={bidderResponseDate}
                    onChange={(e) => setBidderResponseDate(e.target.value)}
                  />
                  <DateBsHint value={bidderResponseDate} />
                </div>
              ),
            }}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => addBidder(false)} disabled={Boolean(guardBidderEntry())}>
              Add bidder
            </Button>
            {(status === "BID_CLOSED" || status === "BID_OPEN_DAY") && (
              <Button
                onClick={() => addBidder(true)}
                disabled={
                  (bidders.length === 0 && !bidderName) || Boolean(guardBidderFinalize())
                }
              >
                Finish bidder entry
              </Button>
            )}
          </div>
        </Card>
      )}

      {canTransition && status === "TECHNICAL_EVAL" && bidders.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="mb-0">
            <div>
              <CardTitle>Technical evaluation</CardTitle>
              <CardDescription>
                Record pass or fail for each bidder, then complete the evaluation.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="mt-4 space-y-3">
            {bidders.map((b) => {
              const bidderId = String(b.id);
              const draft = technicalDraft[bidderId];
              return (
                <div
                  key={bidderId}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-end sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text)]">{String(b.name)}</p>
                    <p className="text-sm text-[var(--color-text-soft)]">{String(b.address)}</p>
                  </div>
                  <Select
                    label="Result"
                    className="w-full sm:w-44"
                    value={draft === true ? "pass" : draft === false ? "fail" : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTechnicalDraft((prev) => ({
                        ...prev,
                        [bidderId]: value === "pass" ? true : value === "fail" ? false : null,
                      }));
                    }}
                  >
                    <option value="">Select…</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </Select>
                </div>
              );
            })}
          </div>
          <Button className="mt-4" disabled={savingTechnical} onClick={completeTechnicalEvaluation}>
            {savingTechnical ? "Saving…" : "Complete technical evaluation"}
          </Button>
        </Card>
      )}

      {bidders.length > 0 && (
        <Card className="mt-6">
          <CardTitle>Bidders</CardTitle>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-soft)]">
                  <th className="py-2 pr-4 text-left">Name</th>
                  <th className="py-2 pr-4 text-left">Address</th>
                  <th className="py-2 pr-4 text-left">Phone</th>
                  <th className="py-2 pr-4 text-left">Bid response</th>
                  <th className="py-2 pr-4 text-left">Tech</th>
                  <th className="py-2 pr-4 text-left">Winner</th>
                  <th className="py-2 pr-4 text-left">Currency</th>
                  <th className="py-2 pr-4 text-left">Payment condition</th>
                  <th className="py-2 pr-4 text-left">Bid (ex-VAT)</th>
                  <th className="py-2 pr-4 text-left">Bid (with VAT)</th>
                  {canTransition && canManageBidders ? (
                    <th className="py-2 text-left">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {bidders.map((b) => {
                  const bidderId = String(b.id);
                  const isEditing = editingBidderId === bidderId;
                  return (
                    <tr key={bidderId} className="border-b border-[var(--color-border)]/50">
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-4">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              type="date"
                              value={editBidResponseDate}
                              onChange={(e) => setEditBidResponseDate(e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2 pr-4">—</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={saveEditBidder}>
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={cancelEditBidder}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-4">{String(b.name)}</td>
                          <td className="py-2 pr-4">{String(b.address)}</td>
                          <td className="py-2 pr-4">{b.phone ? String(b.phone) : "—"}</td>
                          <td className="py-2 pr-4">
                            {b.bidResponseDate ? String(b.bidResponseDate).slice(0, 10) : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {b.passedTech == null ? "—" : b.passedTech ? "Pass" : "Fail"}
                          </td>
                          <td className="py-2 pr-4">{b.isWinner ? "Yes" : "No"}</td>
                          <td className="py-2 pr-4">
                            {b.isWinner && b.bidCurrencyCode ? String(b.bidCurrencyCode) : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {b.isWinner && b.paymentConditionName
                              ? String(b.paymentConditionName)
                              : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {b.isWinner && b.bidAmountWithoutVat != null
                              ? formatCurrency(b.bidAmountWithoutVat as number, {
                                  currencyCode: b.bidCurrencyCode
                                    ? String(b.bidCurrencyCode)
                                    : undefined,
                                })
                              : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {b.isWinner && b.bidAmountWithVat != null
                              ? formatCurrency(b.bidAmountWithVat as number, {
                                  currencyCode: b.bidCurrencyCode
                                    ? String(b.bidCurrencyCode)
                                    : undefined,
                                })
                              : "—"}
                          </td>
                          {canTransition && canManageBidders ? (
                            <td className="py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => startEditBidder(b)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => removeBidder(bidderId, String(b.name))}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canTransition && status === "TECHNICAL_DONE" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--color-text-soft)]">
                Generates one document per bidder: LOI for each technical pass, rejection for each
                fail. Use a single{" "}
                <code className="text-[var(--color-primary)]">{`{{cc_block}}`}</code> in templates
                (CC:, default recipients, then other bidders).
              </p>
              <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={generatingLetters}
                onClick={generateLoiAndRejectionLetters}
              >
                {generatingLetters ? "Generating…" : "Generate LOI / rejection letters"}
              </Button>
              {bidders.some((b) => b.isWinner) && (
                <Button
                  variant="secondary"
                  disabled={generatingLetters}
                  onClick={generateWinnerLoi}
                >
                  Generate winner LOI
                </Button>
              )}
              </div>
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
