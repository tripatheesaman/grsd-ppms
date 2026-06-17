import { addDays } from "date-fns";
import {
  addWorkingDays,
  fromDateOnlyString,
  subtractWorkingDays,
  toDateOnlyString,
  type CalendarContext,
} from "@/lib/calendar/working-days";
import {
  calculateBidFee,
  calculateBidSecurity,
  calculateGrandTotalWithVat,
  calculateValidityDays,
} from "@/lib/formulas/index";
import type { AppSettings } from "@/lib/settings";

export type WorkDayInput = { categoryId: string; days: number };

export type ProcurementCalcInput = {
  costEstimate: number;
  bsfPercent: number;
  bidDays: number;
  noticeDate: string;
  scheduledInitiationDate?: string | null;
  workDays: WorkDayInput[];
};

export type ProcurementCalcResult = {
  bidFee: number;
  bidSecurity: number;
  grandTotalWithVat: number;
  bidValidityDays: number;
  bidFeeSubmissionDate: string;
  bidOpenDate: string;
  prebidDate: string;
  bidValidityDate: string;
  bidSecurityValidityDate: string;
  scheduledCompletionDate: string | null;
};

export function calculateProcurementDates(
  input: ProcurementCalcInput,
  settings: AppSettings,
  calendar: CalendarContext,
): ProcurementCalcResult {
  const notice = fromDateOnlyString(input.noticeDate);

  const bidFeeSubmission = addWorkingDays(notice, input.bidDays, calendar);
  const bidOpen = bidFeeSubmission;
  const prebid = subtractWorkingDays(bidOpen, settings.prebidOffsetDays, calendar);
  const validityDays = calculateValidityDays(input.costEstimate, settings);
  const bidValidity = addWorkingDays(bidOpen, validityDays, calendar);

  let scheduledCompletion: string | null = null;
  if (input.scheduledInitiationDate) {
    const initiation = fromDateOnlyString(input.scheduledInitiationDate);
    const totalCategoryDays = input.workDays.reduce((sum, w) => sum + w.days, 0);
    const completion = addWorkingDays(
      initiation,
      totalCategoryDays + settings.completionBufferDays,
      calendar,
    );
    scheduledCompletion = toDateOnlyString(completion);
  }

  return {
    bidFee: calculateBidFee(input.costEstimate, settings),
    bidSecurity: calculateBidSecurity(input.costEstimate, input.bsfPercent),
    grandTotalWithVat: calculateGrandTotalWithVat(input.costEstimate, settings.vatPercent),
    bidValidityDays: validityDays,
    bidFeeSubmissionDate: toDateOnlyString(bidFeeSubmission),
    bidOpenDate: toDateOnlyString(bidOpen),
    prebidDate: toDateOnlyString(prebid),
    bidValidityDate: toDateOnlyString(bidValidity),
    bidSecurityValidityDate: toDateOnlyString(bidValidity),
    scheduledCompletionDate: scheduledCompletion,
  };
}

export function addCalendarDays(dateStr: string, days: number): string {
  return toDateOnlyString(addDays(fromDateOnlyString(dateStr), days));
}
