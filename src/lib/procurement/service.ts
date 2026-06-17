import { AuditAction, Prisma, ProcurementStatus } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { writeAudit } from "@/lib/audit";
import { dateFromDb, dateOnlyToDb } from "@/lib/dates";
import { calculateBidSecurity } from "@/lib/formulas/index";
import { calculateProcurementDates } from "@/lib/formulas/procurement-calculator";
import { addDays, differenceInCalendarDays } from "date-fns";
import { addWorkingDays, fromDateOnlyString, toDateOnlyString } from "@/lib/calendar/working-days";
import {
  calculatePgValidityDate,
  snapToWorkingDay,
} from "@/lib/procurement/pg-validity";
import {
  calculateElapsedWorkDays,
  calculateWorkCountdown,
} from "@/lib/procurement/work-countdown";
import {
  calculatePriceBidOpenDate,
  isPriceBidWorkingDay,
  priceBidWorkingDayError,
} from "@/lib/procurement/price-bid-date";
import {
  captureProcurementSnapshot,
  loadProcurementSettings,
  parseProcurementSettingsSnapshot,
  resolveProcurementCalculationContext,
} from "@/lib/procurement/settings-snapshot";
import {
  loadReferenceTypeLabels,
  loadWorkDayCategoryLabels,
  resolveBidTypeFromSnapshot,
  resolveNamedLookup,
} from "@/lib/procurement/snapshot-resolve";
import { canTransition } from "@/lib/procurement/workflow";
import { prisma } from "@/lib/prisma";

export type ProcurementInput = {
  title: string;
  itemName: string;
  dtssrNumber?: string | null;
  mediaOfBidId?: string | null;
  bidTypeId?: string | null;
  sbdId?: string | null;
  contractTypeId?: string | null;
  unitId?: string | null;
  costEstimate: number;
  bsfPercent: number;
  totalQuantity?: number | null;
  noticeDate: string;
  scheduledInitiationDate?: string | null;
  prebidTime?: string;
  bidSubmissionTime?: string;
  bidOpenTime?: string;
  references: Array<{ referenceTypeId: string; number: string }>;
  workDays?: Array<{ workDayCategoryId: string; days: number }>;
};

function toDateField(value: string | null | undefined): Date | null {
  if (!value) return null;
  return dateOnlyToDb(value);
}

async function resolvePriceBidOpenDate(
  procurementId: string,
  bidTypeId: string | null,
  options?: { explicitDate?: string; baseDate?: string },
): Promise<string> {
  const bidType = bidTypeId
    ? await prisma.bidType.findUnique({ where: { id: bidTypeId } })
    : null;
  if (!bidType) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bid type is required to schedule price bid opening");
  }

  const { calendar } = await resolveProcurementCalculationContext(procurementId, bidType.defaultBidDays);
  const baseDate = options?.baseDate ?? new Date().toISOString().slice(0, 10);
  const dateStr =
    options?.explicitDate?.trim() ||
    calculatePriceBidOpenDate(baseDate, bidType.defaultPriceBidDays, calendar);

  if (!isPriceBidWorkingDay(dateStr, calendar)) {
    throw new ApiError(400, "VALIDATION_ERROR", priceBidWorkingDayError(dateStr));
  }

  return dateStr;
}

export async function updatePriceBidSchedule(
  id: string,
  priceBidOpenDate: string,
  userId: string,
) {
  const proc = await prisma.procurement.findUnique({ where: { id } });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

  const allowed: ProcurementStatus[] = [
    ProcurementStatus.LETTERS_SENT,
    ProcurementStatus.PRICE_BID_SCHEDULED,
  ];
  if (!allowed.includes(proc.status)) {
    throw new ApiError(
      400,
      "INVALID_STATE",
      "Price bid opening date can only be changed after letters are sent",
    );
  }

  const resolved = await resolvePriceBidOpenDate(id, proc.bidTypeId, {
    explicitDate: priceBidOpenDate,
  });

  await prisma.procurement.update({
    where: { id },
    data: { priceBidOpenDate: toDateField(resolved) },
  });

  await writeAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: "procurement",
    entityId: id,
    after: { priceBidOpenDate: resolved },
  });

  return serializeProcurement(id);
}

export async function serializeProcurement(id: string) {
  const proc = await prisma.procurement.findUnique({
    where: { id },
    include: {
      references: { include: { referenceType: true } },
      workDayCategories: { include: { workDayCategory: true } },
      mediaOfBid: true,
      bidType: true,
      sbd: true,
      contractType: true,
      unit: true,
      bidders: { include: { fieldValues: { include: { field: true } } } },
      pdiMembers: true,
      workflowFieldValues: { include: { field: true } },
    },
  });
  if (!proc) return null;

  const { calendar } = await resolveProcurementCalculationContext(proc.id, 0);
  const poIssue = dateFromDb(proc.poIssueDate);
  const pdiStart = dateFromDb(proc.pdiDate);
  const workTotal =
    proc.workCountdownTotalDays ??
    proc.workDayCategories.reduce((sum, w) => sum + w.days, 0);

  let contractElapsedDays = proc.contractElapsedDays;
  if (
    proc.status === "IN_PROGRESS" &&
    poIssue &&
    workTotal > 0
  ) {
    contractElapsedDays = calculateElapsedWorkDays(
      poIssue,
      new Date().toISOString().slice(0, 10),
      calendar,
      pdiStart,
      dateFromDb(proc.pdiEndDate),
    );
  }

  const workCountdown = calculateWorkCountdown(
    {
      poIssueDate: poIssue,
      pdiStartDate: pdiStart,
      pdiEndDate: dateFromDb(proc.pdiEndDate),
      totalWorkDays: workTotal,
      status: proc.status,
      frozenElapsedDays: proc.contractElapsedDays,
    },
    calendar,
  );
  const workDueDate = workCountdown?.dueDate ?? null;
  const deliveryReceivedDate = dateFromDb(proc.deliveryReceivedDate);
  let deliveryVarianceDays: number | null = null;
  let deliveryPerformance: "EARLY" | "ON_TIME" | "DELAYED" | null = null;
  if (workDueDate && deliveryReceivedDate) {
    deliveryVarianceDays = differenceInCalendarDays(
      fromDateOnlyString(deliveryReceivedDate),
      fromDateOnlyString(workDueDate),
    );
    if (deliveryVarianceDays === 0) deliveryPerformance = "ON_TIME";
    else if (deliveryVarianceDays < 0) deliveryPerformance = "EARLY";
    else deliveryPerformance = "DELAYED";
  }

  const winner = proc.bidders.find((b) => b.isWinner);
  const snapshot = parseProcurementSettingsSnapshot(proc.settingsSnapshot);
  const bidTypeResolved = resolveBidTypeFromSnapshot(snapshot, proc.bidType);
  const mediaResolved = resolveNamedLookup(
    proc.mediaOfBid,
    snapshot?.procurement,
    "mediaOfBidId",
    "mediaOfBidName",
  );
  const sbdResolved = resolveNamedLookup(proc.sbd, snapshot?.procurement, "sbdId", "sbdName");
  const contractTypeResolved = resolveNamedLookup(
    proc.contractType,
    snapshot?.procurement,
    "contractTypeId",
    "contractTypeName",
  );
  const unitResolved = resolveNamedLookup(
    proc.unit,
    snapshot?.procurement,
    "unitId",
    "unitName",
    "unitSymbol",
  );

  return {
    ...proc,
    bidType: bidTypeResolved,
    mediaOfBid: mediaResolved,
    sbd: sbdResolved,
    contractType: contractTypeResolved,
    unit: unitResolved,
    costEstimate: Number(proc.costEstimate),
    bsfPercent: Number(proc.bsfPercent),
    bidFee: proc.bidFee ? Number(proc.bidFee) : null,
    bidSecurity: calculateBidSecurity(Number(proc.costEstimate), Number(proc.bsfPercent)),
    grandTotalWithVat: proc.grandTotalWithVat ? Number(proc.grandTotalWithVat) : null,
    totalQuantity: proc.totalQuantity ? Number(proc.totalQuantity) : null,
    noticeDate: dateFromDb(proc.noticeDate),
    bidFeeSubmissionDate: dateFromDb(proc.bidFeeSubmissionDate),
    bidOpenDate: dateFromDb(proc.bidOpenDate),
    prebidDate: dateFromDb(proc.prebidDate),
    bidValidityDate: dateFromDb(proc.bidValidityDate),
    bidSecurityValidityDate: dateFromDb(proc.bidSecurityValidityDate),
    scheduledInitiationDate: dateFromDb(proc.scheduledInitiationDate),
    scheduledCompletionDate: dateFromDb(proc.scheduledCompletionDate),
    priceBidOpenDate: dateFromDb(proc.priceBidOpenDate),
    technicalEvalSentDate: dateFromDb(proc.technicalEvalSentDate),
    evaluationCommitteeSentDate: dateFromDb(proc.evaluationCommitteeSentDate),
    warrantyDays: proc.warrantyDays,
    pgAmount: proc.pgAmount != null ? Number(proc.pgAmount) : null,
    pgValidityDate: dateFromDb(proc.pgValidityDate),
    loiIssuedDate: dateFromDb(proc.loiIssuedDate),
    loaIssuedDate: dateFromDb(proc.loaIssuedDate),
    loaDocumentDate: dateFromDb(proc.loaDocumentDate),
    cinNumber: proc.cinNumber,
    supplierWitnessName: proc.supplierWitnessName,
    supplierWitnessDesignation: proc.supplierWitnessDesignation,
    supplierSigningAuthorityName: proc.supplierSigningAuthorityName,
    supplierSigningAuthorityDesignation: proc.supplierSigningAuthorityDesignation,
    contractAgreementDate: dateFromDb(proc.contractAgreementDate),
    contractSignedDate: dateFromDb(proc.contractSignedDate),
    poIssueDate: dateFromDb(proc.poIssueDate),
    pdiDate: dateFromDb(proc.pdiDate),
    pdiEndDate: dateFromDb(proc.pdiEndDate),
    pdiMembers: proc.pdiMembers.map((m) => ({
      id: m.id,
      name: m.name,
      designation: m.designation,
    })),
    workCountdownTotalDays: proc.workCountdownTotalDays,
    workCountdownElapsedDays: workCountdown?.elapsedDays ?? null,
    workCountdownRemainingDays: workCountdown?.remainingDays ?? null,
    workCountdownDueDate: workDueDate,
    workCountdownPaused: workCountdown?.isPaused ?? false,
    contractElapsedDays,
    deliveryReceivedDate,
    deliveryVarianceDays,
    deliveryPerformance,
    settingsSnapshotAt: proc.settingsSnapshotAt?.toISOString() ?? null,
    prebidAcknowledgedAt: dateFromDb(proc.prebidAcknowledgedAt),
    bidOpenAcknowledgedAt: dateFromDb(proc.bidOpenAcknowledgedAt),
    priceBidAcknowledgedAt: dateFromDb(proc.priceBidAcknowledgedAt),
    periodBegunAt: dateFromDb(proc.periodBegunAt),
    references: proc.references.map((r) => ({
      id: r.id,
      referenceTypeId: r.referenceTypeId,
      type: r.referenceType?.name ?? r.typeName,
      code: r.referenceType?.code ?? r.typeCode,
      number: r.number,
    })),
    workDays: proc.workDayCategories.map((w) => ({
      workDayCategoryId: w.workDayCategoryId,
      categoryName: w.workDayCategory?.name ?? w.categoryName,
      days: w.days,
    })),
    bidders: proc.bidders.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      bidResponseDate: dateFromDb(b.bidResponseDate),
      passedTech: b.passedTech,
      isWinner: b.isWinner,
      bidCurrencyId: b.bidCurrencyId,
      bidCurrencyCode: b.bidCurrencyCode,
      bidCurrencyName: b.bidCurrencyName,
      bidCurrencySymbol: b.bidCurrencySymbol,
      paymentConditionId: b.paymentConditionId,
      paymentConditionCode: b.paymentConditionCode,
      paymentConditionName: b.paymentConditionName,
      bidAmountWithVat: b.bidAmountWithVat != null ? Number(b.bidAmountWithVat) : null,
      bidAmountWithoutVat: b.bidAmountWithoutVat != null ? Number(b.bidAmountWithoutVat) : null,
    })),
    winnerBidder: winner
      ? {
          id: winner.id,
          name: winner.name,
          bidCurrencyId: winner.bidCurrencyId,
          bidCurrencyCode: winner.bidCurrencyCode,
          bidCurrencyName: winner.bidCurrencyName,
          bidCurrencySymbol: winner.bidCurrencySymbol,
          paymentConditionId: winner.paymentConditionId,
          paymentConditionCode: winner.paymentConditionCode,
          paymentConditionName: winner.paymentConditionName,
          bidAmountWithVat:
            winner.bidAmountWithVat != null ? Number(winner.bidAmountWithVat) : null,
          bidAmountWithoutVat:
            winner.bidAmountWithoutVat != null ? Number(winner.bidAmountWithoutVat) : null,
        }
      : null,
    workflowFieldValues: proc.workflowFieldValues.map((v) => ({
      fieldId: v.fieldId,
      fieldKey: v.field.fieldKey,
      label: v.field.label,
      stageKey: v.field.stageKey,
      fieldType: v.field.fieldType,
      value: v.value,
    })),
  };
}

export async function createOrUpdateProcurement(
  input: ProcurementInput,
  userId: string,
  existingId?: string,
) {
  const references = input.references
    .map((r) => ({ referenceTypeId: r.referenceTypeId, number: r.number.trim() }))
    .filter((r) => r.referenceTypeId && r.number.length > 0);
  if (!references.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one reference number is required");
  }

  const referenceTypeIds = [...new Set(references.map((r) => r.referenceTypeId))];
  const existingReferenceTypes = await prisma.referenceType.findMany({
    where: { id: { in: referenceTypeIds } },
    select: { id: true },
  });
  if (existingReferenceTypes.length !== referenceTypeIds.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "One or more reference types are invalid");
  }

  const workDays = (input.workDays ?? []).filter((w) => w.workDayCategoryId);
  const workDayCategoryIds = [...new Set(workDays.map((w) => w.workDayCategoryId))];
  if (workDayCategoryIds.length > 0) {
    const existingCategories = await prisma.workDayCategory.findMany({
      where: { id: { in: workDayCategoryIds } },
      select: { id: true },
    });
    if (existingCategories.length !== workDayCategoryIds.length) {
      throw new ApiError(400, "VALIDATION_ERROR", "One or more work day categories are invalid");
    }
  }

  const bidType = input.bidTypeId
    ? await prisma.bidType.findUnique({ where: { id: input.bidTypeId } })
    : null;
  if (!bidType) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bid type is required");
  }

  const isCreate = !existingId;
  let snapshotForCreate: Awaited<ReturnType<typeof captureProcurementSnapshot>> | undefined;
  if (isCreate) {
    snapshotForCreate = await captureProcurementSnapshot(bidType, {
      mediaOfBidId: input.mediaOfBidId,
      sbdId: input.sbdId,
      contractTypeId: input.contractTypeId,
      unitId: input.unitId,
    });
  }

  const { settings, calendar, bidDays } = await resolveProcurementCalculationContext(
    existingId,
    bidType.defaultBidDays,
  );
  const calculated = calculateProcurementDates(
    {
      costEstimate: input.costEstimate,
      bsfPercent: input.bsfPercent,
      bidDays,
      noticeDate: input.noticeDate,
      scheduledInitiationDate: input.scheduledInitiationDate,
      workDays: workDays.map((w) => ({ categoryId: w.workDayCategoryId, days: w.days })),
    },
    settings,
    calendar,
  );

  const data: Prisma.ProcurementUpdateInput = {
    title: input.title,
    itemName: input.itemName,
    dtssrNumber: input.dtssrNumber,
    mediaOfBid: input.mediaOfBidId ? { connect: { id: input.mediaOfBidId } } : { disconnect: true },
    bidType: { connect: { id: input.bidTypeId! } },
    sbd: input.sbdId ? { connect: { id: input.sbdId } } : { disconnect: true },
    contractType: input.contractTypeId
      ? { connect: { id: input.contractTypeId } }
      : { disconnect: true },
    unit: input.unitId ? { connect: { id: input.unitId } } : { disconnect: true },
    costEstimate: input.costEstimate,
    bsfPercent: input.bsfPercent,
    totalQuantity: input.totalQuantity,
    bidFee: calculated.bidFee,
    bidSecurity: calculateBidSecurity(input.costEstimate, input.bsfPercent),
    grandTotalWithVat: calculated.grandTotalWithVat,
    bidValidityDays: calculated.bidValidityDays,
    noticeDate: toDateField(input.noticeDate),
    bidFeeSubmissionDate: toDateField(calculated.bidFeeSubmissionDate),
    bidOpenDate: toDateField(calculated.bidOpenDate),
    prebidDate: toDateField(calculated.prebidDate),
    bidValidityDate: toDateField(calculated.bidValidityDate),
    bidSecurityValidityDate: toDateField(calculated.bidSecurityValidityDate),
    scheduledInitiationDate: toDateField(input.scheduledInitiationDate),
    scheduledCompletionDate: toDateField(calculated.scheduledCompletionDate),
    prebidTime: input.prebidTime ?? settings.defaultPrebidTime,
    bidSubmissionTime: input.bidSubmissionTime ?? settings.defaultBidSubmissionTime,
    bidOpenTime: input.bidOpenTime ?? settings.defaultBidOpenTime,
  };

  let procurementId = existingId;
  if (existingId) {
    await prisma.procurement.update({ where: { id: existingId }, data });
    await prisma.procurementReference.deleteMany({ where: { procurementId: existingId } });
    if (input.workDays !== undefined) {
      await prisma.procurementWorkDayCategory.deleteMany({ where: { procurementId: existingId } });
    }
  } else {
    const created = await prisma.procurement.create({
      data: {
        title: input.title,
        itemName: input.itemName,
        dtssrNumber: input.dtssrNumber,
        status: ProcurementStatus.ACTIVE,
        periodBegunAt: new Date(),
        mediaOfBidId: input.mediaOfBidId,
        bidTypeId: input.bidTypeId!,
        sbdId: input.sbdId,
        contractTypeId: input.contractTypeId,
        unitId: input.unitId,
        costEstimate: input.costEstimate,
        bsfPercent: input.bsfPercent,
        totalQuantity: input.totalQuantity,
        bidFee: calculated.bidFee,
        bidSecurity: calculateBidSecurity(input.costEstimate, input.bsfPercent),
        grandTotalWithVat: calculated.grandTotalWithVat,
        bidValidityDays: calculated.bidValidityDays,
        noticeDate: toDateField(input.noticeDate),
        bidFeeSubmissionDate: toDateField(calculated.bidFeeSubmissionDate),
        bidOpenDate: toDateField(calculated.bidOpenDate),
        prebidDate: toDateField(calculated.prebidDate),
        bidValidityDate: toDateField(calculated.bidValidityDate),
        bidSecurityValidityDate: toDateField(calculated.bidSecurityValidityDate),
        scheduledInitiationDate: toDateField(input.scheduledInitiationDate),
        scheduledCompletionDate: toDateField(calculated.scheduledCompletionDate),
        prebidTime: input.prebidTime ?? settings.defaultPrebidTime,
        bidSubmissionTime: input.bidSubmissionTime ?? settings.defaultBidSubmissionTime,
        bidOpenTime: input.bidOpenTime ?? settings.defaultBidOpenTime,
        settingsSnapshot: snapshotForCreate!,
        settingsSnapshotAt: new Date(),
      },
    });
    procurementId = created.id;
  }

  const referenceLabels = await loadReferenceTypeLabels(referenceTypeIds);
  const workDayLabels = await loadWorkDayCategoryLabels(workDayCategoryIds);

  await prisma.procurementReference.createMany({
    data: references.map((r) => ({
      procurementId: procurementId!,
      referenceTypeId: r.referenceTypeId,
      typeName: referenceLabels.get(r.referenceTypeId)!.name,
      typeCode: referenceLabels.get(r.referenceTypeId)!.code,
      number: r.number,
    })),
  });
  if (input.workDays !== undefined && workDays.length > 0) {
    await prisma.procurementWorkDayCategory.createMany({
      data: workDays.map((w) => ({
        procurementId: procurementId!,
        workDayCategoryId: w.workDayCategoryId,
        categoryName: workDayLabels.get(w.workDayCategoryId) ?? "Category",
        days: w.days,
      })),
    });
  }

  if (!existingId) {
    await prisma.procurementEvent.create({
      data: {
        procurementId: procurementId!,
        userId,
        action: "TRANSITION",
        fromStatus: ProcurementStatus.DRAFT,
        toStatus: ProcurementStatus.ACTIVE,
        payload: { autoBegin: true },
      },
    });
  }

  await writeAudit({
    userId,
    action: existingId ? AuditAction.UPDATE : AuditAction.CREATE,
    entityType: "procurement",
    entityId: procurementId,
    after: existingId ? input : { ...input, status: ProcurementStatus.ACTIVE },
  });

  return serializeProcurement(procurementId!);
}

export async function transitionProcurement(
  id: string,
  toStatus: ProcurementStatus,
  userId: string,
  payload?: Record<string, unknown>,
) {
  const proc = await prisma.procurement.findUnique({ where: { id } });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  if (!canTransition(proc.status, toStatus)) {
    throw new ApiError(400, "INVALID_TRANSITION", `Cannot transition from ${proc.status} to ${toStatus}`);
  }

  const update: Prisma.ProcurementUpdateInput = { status: toStatus };
  let pdiMembersInput: Array<{ name: string; designation: string }> | null = null;

  if (toStatus === ProcurementStatus.ACTIVE) {
    update.periodBegunAt = new Date();
  }
  if (toStatus === ProcurementStatus.PREBID_OPEN) {
    const raw = payload?.prebidAcknowledgedAt ?? payload?.prebidAcknowledgedDate;
    update.prebidAcknowledgedAt = raw
      ? toDateField(String(raw))
      : toDateField(dateFromDb(proc.prebidDate) ?? undefined) ?? new Date();
  }
  if (toStatus === ProcurementStatus.BID_OPEN_DAY) {
    const raw = payload?.bidOpenAcknowledgedAt ?? payload?.bidOpenAcknowledgedDate;
    update.bidOpenAcknowledgedAt = raw
      ? toDateField(String(raw))
      : toDateField(dateFromDb(proc.bidOpenDate) ?? undefined) ?? new Date();
  }
  if (toStatus === ProcurementStatus.PRICE_BID_OPEN) {
    const openDate = await resolvePriceBidOpenDate(id, proc.bidTypeId, {
      explicitDate: payload?.priceBidOpenDate ? String(payload.priceBidOpenDate) : undefined,
    });
    update.priceBidOpenDate = toDateField(openDate);
    update.priceBidAcknowledgedAt = toDateField(openDate);
  }
  if (toStatus === ProcurementStatus.WITH_FINANCE) {
    const sent = payload?.evaluationCommitteeSentDate
      ? String(payload.evaluationCommitteeSentDate)
      : new Date().toISOString().slice(0, 10);
    update.evaluationCommitteeSentDate = toDateField(sent);
  }
  if (toStatus === ProcurementStatus.TECHNICAL_EVAL && payload?.technicalEvalSentDate) {
    update.technicalEvalSentDate = toDateField(String(payload.technicalEvalSentDate));
  }
  if (toStatus === ProcurementStatus.LOI_ISSUED) {
    update.loiIssuedDate = new Date();
  }
  if (toStatus === ProcurementStatus.LOA_ISSUED) {
    const settings = await loadProcurementSettings(id);
    const { calendar } = await resolveProcurementCalculationContext(id, 0);
    const loiDate = dateFromDb(proc.loiIssuedDate);
    if (!loiDate) {
      throw new ApiError(400, "VALIDATION_ERROR", "LOI must be issued before LOA");
    }
    const loaDocRaw = payload?.loaDocumentDate ? String(payload.loaDocumentDate) : undefined;
    const loaDoc =
      loaDocRaw ??
      toDateOnlyString(
        addWorkingDays(fromDateOnlyString(loiDate), settings.loaDelayDays, calendar),
      );
    const loaDocumentDate = snapToWorkingDay(loaDoc, calendar);
    update.loaDocumentDate = toDateField(loaDocumentDate);
    update.loaIssuedDate = toDateField(loaDocumentDate);

    const workTotal =
      proc.workCountdownTotalDays ??
      (await prisma.procurementWorkDayCategory.aggregate({
        where: { procurementId: id },
        _sum: { days: true },
      }))._sum.days ??
      0;
    const warranty = proc.warrantyDays ?? 0;
    update.pgValidityDate = toDateField(
      calculatePgValidityDate(
        loaDocumentDate,
        workTotal,
        warranty,
        settings.pgValidityExtensionDays,
        calendar,
      ),
    );
  }
  if (toStatus === ProcurementStatus.CONTRACT_SIGNED) {
    const cinNumber = payload?.cinNumber ? String(payload.cinNumber).trim() : proc.cinNumber?.trim();
    if (!cinNumber) {
      throw new ApiError(400, "VALIDATION_ERROR", "CIN number is required before contract issuance");
    }
    const supplierWitnessName = payload?.supplierWitnessName
      ? String(payload.supplierWitnessName).trim()
      : proc.supplierWitnessName?.trim();
    const supplierWitnessDesignation = payload?.supplierWitnessDesignation
      ? String(payload.supplierWitnessDesignation).trim()
      : proc.supplierWitnessDesignation?.trim();
    const supplierSigningAuthorityName = payload?.supplierSigningAuthorityName
      ? String(payload.supplierSigningAuthorityName).trim()
      : proc.supplierSigningAuthorityName?.trim();
    const supplierSigningAuthorityDesignation = payload?.supplierSigningAuthorityDesignation
      ? String(payload.supplierSigningAuthorityDesignation).trim()
      : proc.supplierSigningAuthorityDesignation?.trim();
    if (
      !supplierWitnessName ||
      !supplierWitnessDesignation ||
      !supplierSigningAuthorityName ||
      !supplierSigningAuthorityDesignation
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Supplier witness and signing authority details are required before contract issuance",
      );
    }
    const agreementDate = payload?.contractAgreementDate
      ? String(payload.contractAgreementDate)
      : new Date().toISOString().slice(0, 10);
    const { calendar } = await resolveProcurementCalculationContext(id, 0);
    const snapped = snapToWorkingDay(agreementDate, calendar);
    update.cinNumber = cinNumber;
    update.supplierWitnessName = supplierWitnessName;
    update.supplierWitnessDesignation = supplierWitnessDesignation;
    update.supplierSigningAuthorityName = supplierSigningAuthorityName;
    update.supplierSigningAuthorityDesignation = supplierSigningAuthorityDesignation;
    update.contractAgreementDate = toDateField(snapped);
    update.contractSignedDate = toDateField(snapped);
  }
  if (toStatus === ProcurementStatus.IN_PROGRESS) {
    const poDate = payload?.poIssueDate ? String(payload.poIssueDate) : null;
    if (!poDate && proc.status === ProcurementStatus.CONTRACT_SIGNED) {
      throw new ApiError(400, "VALIDATION_ERROR", "PO issue date is required");
    }
    if (poDate) {
      const { calendar } = await resolveProcurementCalculationContext(id, 0);
      const snapped = snapToWorkingDay(poDate, calendar);
      update.poIssueDate = toDateField(snapped);
      update.periodBegunAt = toDateField(snapped);
      update.contractElapsedDays = 0;
    }
    if (proc.status === ProcurementStatus.PDI_PHASE) {
      const pdiEnd = payload?.pdiEndDate ? String(payload.pdiEndDate) : new Date().toISOString().slice(0, 10);
      update.pdiEndDate = toDateField(pdiEnd);
      update.pdiCompletedAt = new Date();
      update.contractFrozenAt = null;
    }
  }
  if (toStatus === ProcurementStatus.PDI_PHASE && payload?.pdiDate) {
    const pdiStart = String(payload.pdiDate);
    const members = Array.isArray(payload?.pdiMembers)
      ? (payload.pdiMembers as Array<Record<string, unknown>>)
          .map((row) => ({
            name: String(row?.name ?? "").trim(),
            designation: String(row?.designation ?? "").trim(),
          }))
          .filter((row) => row.name && row.designation)
      : [];
    if (members.length === 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Add at least one PDI member");
    }
    pdiMembersInput = members;
    update.pdiDate = toDateField(pdiStart);
    update.contractFrozenAt = new Date();
    const poDate = dateFromDb(proc.poIssueDate);
    if (poDate) {
      const { calendar } = await resolveProcurementCalculationContext(id, 0);
      const start = fromDateOnlyString(pdiStart);
      const countThrough = addDays(start, -1);
      const asOf =
        countThrough >= fromDateOnlyString(poDate)
          ? toDateOnlyString(countThrough)
          : poDate;
      update.contractElapsedDays = calculateElapsedWorkDays(poDate, asOf, calendar);
    }
  }
  if (toStatus === ProcurementStatus.COMPLETED && payload?.deliveryReceivedDate) {
    update.deliveryReceivedDate = toDateField(String(payload.deliveryReceivedDate));
  }

  await prisma.procurement.update({ where: { id }, data: update });
  if (toStatus === ProcurementStatus.PDI_PHASE && pdiMembersInput) {
    await prisma.procurementPdiMember.deleteMany({ where: { procurementId: id } });
    await prisma.procurementPdiMember.createMany({
      data: pdiMembersInput.map((m) => ({
        procurementId: id,
        name: m.name,
        designation: m.designation,
      })),
    });
  }
  await prisma.procurementEvent.create({
    data: {
      procurementId: id,
      userId,
      action: "TRANSITION",
      fromStatus: proc.status,
      toStatus,
      payload: payload as object,
    },
  });
  await writeAudit({
    userId,
    action: AuditAction.TRANSITION,
    entityType: "procurement",
    entityId: id,
    before: { status: proc.status },
    after: { status: toStatus },
  });

  return serializeProcurement(id);
}

export async function saveProcurementCinNumber(id: string, cinNumber: string, userId: string) {
  const proc = await prisma.procurement.findUnique({
    where: { id },
    select: { id: true, status: true, cinNumber: true },
  });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  const trimmed = cinNumber.trim();
  if (!trimmed) {
    throw new ApiError(400, "VALIDATION_ERROR", "CIN number is required");
  }
  if (
    proc.status !== ProcurementStatus.LOA_ISSUED &&
    proc.status !== ProcurementStatus.CONTRACT_SIGNED &&
    proc.status !== ProcurementStatus.IN_PROGRESS &&
    proc.status !== ProcurementStatus.PDI_PHASE &&
    proc.status !== ProcurementStatus.COMPLETED
  ) {
    throw new ApiError(400, "INVALID_STATUS", "CIN can be entered only after LOA issuance");
  }

  await prisma.procurement.update({
    where: { id },
    data: { cinNumber: trimmed },
  });
  await writeAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: "procurement",
    entityId: id,
    before: { cinNumber: proc.cinNumber ?? null },
    after: { cinNumber: trimmed },
  });

  return serializeProcurement(id);
}

export async function saveProcurementPreContractDetails(
  id: string,
  input: {
    cinNumber: string;
    supplierWitnessName: string;
    supplierWitnessDesignation: string;
    supplierSigningAuthorityName: string;
    supplierSigningAuthorityDesignation: string;
  },
  userId: string,
) {
  const proc = await prisma.procurement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      cinNumber: true,
      supplierWitnessName: true,
      supplierWitnessDesignation: true,
      supplierSigningAuthorityName: true,
      supplierSigningAuthorityDesignation: true,
    },
  });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  if (
    proc.status !== ProcurementStatus.LOA_ISSUED &&
    proc.status !== ProcurementStatus.CONTRACT_SIGNED &&
    proc.status !== ProcurementStatus.IN_PROGRESS &&
    proc.status !== ProcurementStatus.PDI_PHASE &&
    proc.status !== ProcurementStatus.COMPLETED
  ) {
    throw new ApiError(400, "INVALID_STATUS", "Pre-contract details can be entered only after LOA issuance");
  }

  const next = {
    cinNumber: input.cinNumber.trim(),
    supplierWitnessName: input.supplierWitnessName.trim(),
    supplierWitnessDesignation: input.supplierWitnessDesignation.trim(),
    supplierSigningAuthorityName: input.supplierSigningAuthorityName.trim(),
    supplierSigningAuthorityDesignation: input.supplierSigningAuthorityDesignation.trim(),
  };
  if (
    !next.cinNumber ||
    !next.supplierWitnessName ||
    !next.supplierWitnessDesignation ||
    !next.supplierSigningAuthorityName ||
    !next.supplierSigningAuthorityDesignation
  ) {
    throw new ApiError(400, "VALIDATION_ERROR", "All pre-contract details are required");
  }

  await prisma.procurement.update({
    where: { id },
    data: next,
  });
  await writeAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: "procurement",
    entityId: id,
    before: {
      cinNumber: proc.cinNumber ?? null,
      supplierWitnessName: proc.supplierWitnessName ?? null,
      supplierWitnessDesignation: proc.supplierWitnessDesignation ?? null,
      supplierSigningAuthorityName: proc.supplierSigningAuthorityName ?? null,
      supplierSigningAuthorityDesignation: proc.supplierSigningAuthorityDesignation ?? null,
    },
    after: next,
  });

  return serializeProcurement(id);
}

const STATUS_CORRECTION_PREVIOUS: Partial<Record<ProcurementStatus, ProcurementStatus>> = {
  ACTIVE: ProcurementStatus.DRAFT,
  PREBID_OPEN: ProcurementStatus.ACTIVE,
  BID_OPEN_DAY: ProcurementStatus.PREBID_OPEN,
  BID_CLOSED: ProcurementStatus.BID_OPEN_DAY,
  BIDDERS_ENTERED: ProcurementStatus.BID_CLOSED,
  TECHNICAL_EVAL: ProcurementStatus.BIDDERS_ENTERED,
  TECHNICAL_DONE: ProcurementStatus.TECHNICAL_EVAL,
  LETTERS_SENT: ProcurementStatus.TECHNICAL_DONE,
  PRICE_BID_OPEN: ProcurementStatus.LETTERS_SENT,
  WITH_FINANCE: ProcurementStatus.PRICE_BID_OPEN,
  WINNER_SELECTED: ProcurementStatus.WITH_FINANCE,
  LOI_ISSUED: ProcurementStatus.WINNER_SELECTED,
  LOA_ISSUED: ProcurementStatus.LOI_ISSUED,
  CONTRACT_SIGNED: ProcurementStatus.LOA_ISSUED,
  IN_PROGRESS: ProcurementStatus.CONTRACT_SIGNED,
  PDI_PHASE: ProcurementStatus.IN_PROGRESS,
};

export type StatusCorrectionAction = "STEP_BACK" | "CANCEL" | "REOPEN_COMPLETED";

export async function correctProcurementStatus(
  id: string,
  action: StatusCorrectionAction,
  userId: string,
) {
  const proc = await prisma.procurement.findUnique({ where: { id } });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

  let toStatus: ProcurementStatus;
  if (action === "STEP_BACK") {
    const previous = STATUS_CORRECTION_PREVIOUS[proc.status];
    if (!previous) {
      throw new ApiError(400, "INVALID_TRANSITION", "Step-back is not allowed from this status");
    }
    toStatus = previous;
  } else if (action === "CANCEL") {
    if (proc.status === ProcurementStatus.CANCELLED) {
      throw new ApiError(400, "INVALID_TRANSITION", "Procurement is already cancelled");
    }
    if (proc.status === ProcurementStatus.COMPLETED) {
      throw new ApiError(
        400,
        "INVALID_TRANSITION",
        "Completed procurement cannot be cancelled. Use reopen first.",
      );
    }
    toStatus = ProcurementStatus.CANCELLED;
  } else {
    if (proc.status !== ProcurementStatus.COMPLETED) {
      throw new ApiError(400, "INVALID_TRANSITION", "Only completed procurement can be reopened");
    }
    toStatus = ProcurementStatus.IN_PROGRESS;
  }

  await prisma.procurement.update({ where: { id }, data: { status: toStatus } });
  await prisma.procurementEvent.create({
    data: {
      procurementId: id,
      userId,
      action: "TRANSITION",
      fromStatus: proc.status,
      toStatus,
      payload: { correctionAction: action },
    },
  });
  await writeAudit({
    userId,
    action: AuditAction.TRANSITION,
    entityType: "procurement",
    entityId: id,
    before: { status: proc.status },
    after: { status: toStatus, correctionAction: action },
  });

  return serializeProcurement(id);
}

export async function restartProcurement(id: string, userId: string) {
  const source = await serializeProcurement(id);
  if (!source) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

  const input: ProcurementInput = {
    title: source.title,
    itemName: source.itemName,
    dtssrNumber: source.dtssrNumber,
    mediaOfBidId: source.mediaOfBidId,
    bidTypeId: source.bidTypeId,
    sbdId: source.sbdId,
    contractTypeId: source.contractTypeId,
    unitId: source.unitId,
    costEstimate: source.costEstimate,
    bsfPercent: source.bsfPercent,
    totalQuantity: source.totalQuantity,
    noticeDate: source.noticeDate!,
    scheduledInitiationDate: source.scheduledInitiationDate,
    prebidTime: source.prebidTime,
    bidSubmissionTime: source.bidSubmissionTime,
    bidOpenTime: source.bidOpenTime,
    references: source.references
      .filter((r): r is typeof r & { referenceTypeId: string } => Boolean(r.referenceTypeId))
      .map((r) => ({
        referenceTypeId: r.referenceTypeId,
        number: r.number,
      })),
    workDays: source.workDays
      .filter((w): w is typeof w & { workDayCategoryId: string } =>
        Boolean(w.workDayCategoryId),
      )
      .map((w) => ({
        workDayCategoryId: w.workDayCategoryId,
        days: w.days,
      })),
  };

  const created = await createOrUpdateProcurement(input, userId);
  if (!created) throw new ApiError(500, "INTERNAL_ERROR", "Failed to restart");
  await prisma.procurement.update({
    where: { id: created.id },
    data: { sourceProcurementId: id },
  });
  return serializeProcurement(created.id);
}

export async function refreshProcurementWithCurrentSettings(id: string, userId: string) {
  const proc = await prisma.procurement.findUnique({
    where: { id },
    include: {
      bidType: true,
      workDayCategories: true,
    },
  });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  if (!proc.bidType) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bid type is required");
  }
  if (!proc.noticeDate) {
    throw new ApiError(400, "VALIDATION_ERROR", "Notice date is required");
  }

  const snapshot = await captureProcurementSnapshot(proc.bidType, {
    mediaOfBidId: proc.mediaOfBidId,
    sbdId: proc.sbdId,
    contractTypeId: proc.contractTypeId,
    unitId: proc.unitId,
  });
  const noticeDate = dateFromDb(proc.noticeDate);
  if (!noticeDate) {
    throw new ApiError(400, "VALIDATION_ERROR", "Notice date is required");
  }

  const calculated = calculateProcurementDates(
    {
      costEstimate: Number(proc.costEstimate),
      bsfPercent: Number(proc.bsfPercent),
      bidDays: snapshot.bidDays,
      noticeDate,
      scheduledInitiationDate: dateFromDb(proc.scheduledInitiationDate),
      workDays: proc.workDayCategories.map((w) => ({
        categoryId: w.workDayCategoryId ?? w.id,
        days: w.days,
      })),
    },
    snapshot.settings,
    snapshot.calendar,
  );

  await prisma.procurement.update({
    where: { id },
    data: {
      bidFee: calculated.bidFee,
      bidSecurity: calculateBidSecurity(
        Number(proc.costEstimate),
        Number(proc.bsfPercent),
      ),
      grandTotalWithVat: calculated.grandTotalWithVat,
      bidValidityDays: calculated.bidValidityDays,
      bidFeeSubmissionDate: toDateField(calculated.bidFeeSubmissionDate),
      bidOpenDate: toDateField(calculated.bidOpenDate),
      prebidDate: toDateField(calculated.prebidDate),
      bidValidityDate: toDateField(calculated.bidValidityDate),
      bidSecurityValidityDate: toDateField(calculated.bidSecurityValidityDate),
      scheduledCompletionDate: toDateField(calculated.scheduledCompletionDate),
      prebidTime: snapshot.settings.defaultPrebidTime,
      bidSubmissionTime: snapshot.settings.defaultBidSubmissionTime,
      bidOpenTime: snapshot.settings.defaultBidOpenTime,
      settingsSnapshot: snapshot,
      settingsSnapshotAt: new Date(),
    },
  });

  await writeAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: "procurement",
    entityId: id,
    after: { action: "refresh_settings_snapshot", capturedAt: snapshot.capturedAt },
  });

  return serializeProcurement(id);
}

export async function deleteProcurement(id: string, userId: string) {
  const proc = await prisma.procurement.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

  await writeAudit({
    userId,
    action: AuditAction.DELETE,
    entityType: "procurement",
    entityId: id,
    before: { title: proc.title, status: proc.status },
  });

  await prisma.procurement.delete({ where: { id } });
  return { success: true };
}
