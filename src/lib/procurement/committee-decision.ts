import { ProcurementStatus } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { writeAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

import { calculatePgAmount, normalizePgFormulaSettings } from "@/lib/formulas/pg-calculator";
import { loadProcurementSettings } from "@/lib/procurement/settings-snapshot";
import { loadWorkDayCategoryLabels } from "@/lib/procurement/snapshot-resolve";
import { prisma } from "@/lib/prisma";
import { serializeProcurement } from "@/lib/procurement/service";
export type CommitteeDecisionInput = {
  winnerBidderId: string;
  bidCurrencyId: string;
  paymentConditionId: string;
  bidAmountWithVat: number;
  bidAmountWithoutVat: number;
  warrantyDays: number;
  workDays: Array<{ workDayCategoryId: string; days: number }>;
};

export async function saveCommitteeDecision(
  procurementId: string,
  input: CommitteeDecisionInput,
  userId: string,
) {
  const proc = await prisma.procurement.findUnique({
    where: { id: procurementId },
    include: { bidders: true },
  });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  if (proc.status !== ProcurementStatus.WITH_FINANCE && proc.status !== ProcurementStatus.WINNER_SELECTED) {
    throw new ApiError(
      400,
      "INVALID_STATE",
      "Committee decision can only be edited before LOI is issued",
    );
  }

  const winner = proc.bidders.find((b) => b.id === input.winnerBidderId);
  if (!winner?.passedTech) {
    throw new ApiError(400, "VALIDATION_ERROR", "Winner must be a technically passed bidder");
  }

  if (input.bidAmountWithoutVat <= 0 || input.bidAmountWithVat <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bid amounts must be greater than zero");
  }

  if (input.warrantyDays < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Warranty days cannot be negative");
  }

  const workDays = input.workDays.filter((w) => w.days > 0);
  if (workDays.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Enter at least one work day category");
  }

  const settings = await loadProcurementSettings(procurementId);
  const bidCurrency = await prisma.currency.findUnique({ where: { id: input.bidCurrencyId } });
  if (!bidCurrency || !bidCurrency.isActive) {
    throw new ApiError(400, "VALIDATION_ERROR", "Select a valid bid currency");
  }
  const paymentCondition = await prisma.paymentCondition.findUnique({
    where: { id: input.paymentConditionId },
  });
  if (!paymentCondition || !paymentCondition.isActive) {
    throw new ApiError(400, "VALIDATION_ERROR", "Select a valid payment condition");
  }
  const costWithoutVat = Number(proc.costEstimate);
  const pg = calculatePgAmount(
    {
      costEstimateWithoutVat: costWithoutVat,
      bidAmountWithoutVat: input.bidAmountWithoutVat,
    },
    normalizePgFormulaSettings({
      pgDiscountThresholdPercent: settings.pgDiscountThresholdPercent,
      pgLowDiscountRatePercent: settings.pgLowDiscountRatePercent,
      pgFrontLoadingCostFactor: settings.pgFrontLoadingCostFactor,
      pgFrontLoadingRate: settings.pgFrontLoadingRate,
    }),
  );

  const workTotal = workDays.reduce((sum, w) => sum + w.days, 0);
  const categoryLabels = await loadWorkDayCategoryLabels(workDays.map((w) => w.workDayCategoryId));

  await prisma.$transaction(async (tx) => {
    await tx.bidder.updateMany({
      where: { procurementId },
      data: {
        isWinner: false,
        bidAmountWithVat: null,
        bidAmountWithoutVat: null,
        bidCurrencyId: null,
        bidCurrencyCode: null,
        bidCurrencyName: null,
        bidCurrencySymbol: null,
        paymentConditionId: null,
        paymentConditionCode: null,
        paymentConditionName: null,
      },
    });
    await tx.bidder.update({
      where: { id: input.winnerBidderId },
      data: {
        isWinner: true,
        bidCurrencyId: bidCurrency.id,
        bidCurrencyCode: bidCurrency.code,
        bidCurrencyName: bidCurrency.name,
        bidCurrencySymbol: bidCurrency.symbol,
        paymentConditionId: paymentCondition.id,
        paymentConditionCode: paymentCondition.code,
        paymentConditionName: paymentCondition.name,
        bidAmountWithVat: input.bidAmountWithVat,
        bidAmountWithoutVat: input.bidAmountWithoutVat,
      },
    });

    await tx.procurementWorkDayCategory.deleteMany({ where: { procurementId } });
    await tx.procurementWorkDayCategory.createMany({
      data: workDays.map((w) => ({
        procurementId,
        workDayCategoryId: w.workDayCategoryId,
        categoryName: categoryLabels.get(w.workDayCategoryId) ?? "Category",
        days: w.days,
      })),
    });

    await tx.procurement.update({
      where: { id: procurementId },
      data: {
        ...(proc.status === ProcurementStatus.WITH_FINANCE
          ? { status: ProcurementStatus.WINNER_SELECTED }
          : {}),
        warrantyDays: input.warrantyDays,
        pgAmount: pg.pgAmount,
        workCountdownTotalDays: workTotal,
      },
    });
  });

  await writeAudit({
    userId,
    action: AuditAction.UPDATE,
    entityType: "procurement",
    entityId: procurementId,
    after: { ...input, pgAmount: pg.pgAmount, pgMethod: pg.method },
  });

  return serializeProcurement(procurementId);
}
