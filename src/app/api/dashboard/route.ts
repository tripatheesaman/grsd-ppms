import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { loadCalendarContext } from "@/lib/calendar/load-context";
import { dateFromDb } from "@/lib/dates";
import { calculateWorkCountdown } from "@/lib/procurement/work-countdown";
import { resolveProcurementCalculationContext } from "@/lib/procurement/settings-snapshot";
import { loadSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import {
  evaluateMilestoneReminder,
  isKnownMilestoneKey,
  type MilestoneProcurement,
} from "@/lib/reminders/milestones";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "dashboard.view");
    const today = startOfDay(new Date());
    const settings = await loadSettings();
    const calendar = await loadCalendarContext();

    const [statusCounts, upcomingRules, procurements] = await Promise.all([
      prisma.procurement.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.reminderRule.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } }),
      prisma.procurement.findMany({
        where: { status: { notIn: ["COMPLETED", "CANCELLED", "DRAFT"] } },
        select: {
          id: true,
          title: true,
          status: true,
          prebidAcknowledgedAt: true,
          bidOpenAcknowledgedAt: true,
          prebidDate: true,
          bidFeeSubmissionDate: true,
          bidOpenDate: true,
          priceBidOpenDate: true,
          bidValidityDate: true,
          scheduledInitiationDate: true,
          scheduledCompletionDate: true,
          loiIssuedDate: true,
          loaIssuedDate: true,
          poIssueDate: true,
          pdiDate: true,
          pdiEndDate: true,
          workCountdownTotalDays: true,
          contractElapsedDays: true,
        },
      }),
    ]);

    const upcoming: Array<{
      procurementId: string;
      title: string;
      milestoneKey: string;
      milestoneLabel: string;
      targetDate: string;
      daysUntil: number;
      severity: string;
    }> = [];

    for (const proc of procurements) {
      const milestoneProc: MilestoneProcurement = proc;
      for (const rule of upcomingRules) {
        if (!isKnownMilestoneKey(rule.milestoneKey)) continue;
        const result = evaluateMilestoneReminder(milestoneProc, rule.milestoneKey, rule, today, {
          loaDelayDays: rule.offsetWorkingDays ?? settings.loaDelayDays,
          calendar,
        });
        if (!result) continue;
        upcoming.push({
          procurementId: proc.id,
          title: proc.title,
          milestoneKey: rule.milestoneKey,
          milestoneLabel: rule.label,
          targetDate: result.targetDate,
          daysUntil: result.daysUntil,
          severity: result.severity,
        });
      }
    }

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    const workCountdown = (
      await Promise.all(
        procurements
          .filter((p) => p.poIssueDate && p.workCountdownTotalDays != null)
          .map(async (p) => {
            const { calendar: procCalendar } = await resolveProcurementCalculationContext(p.id, 0);
            const countdown = calculateWorkCountdown(
              {
                poIssueDate: dateFromDb(p.poIssueDate),
                pdiStartDate: dateFromDb(p.pdiDate),
                pdiEndDate: dateFromDb(p.pdiEndDate),
                totalWorkDays: p.workCountdownTotalDays ?? 0,
                status: p.status,
                frozenElapsedDays: p.contractElapsedDays,
              },
              procCalendar,
            );
            if (!countdown?.dueDate) return null;
            return {
              procurementId: p.id,
              title: p.title,
              status: p.status,
              dueDate: countdown.dueDate,
              remainingDays: countdown.remainingDays,
            };
          }),
      )
    ).filter((row): row is NonNullable<typeof row> => Boolean(row));

    workCountdown.sort((a, b) => a.remainingDays - b.remainingDays);

    return jsonOk({
      statusCounts,
      upcoming: upcoming.slice(0, 50),
      workCountdown: workCountdown.slice(0, 50),
      totals: {
        active: statusCounts.find((s) => s.status === "ACTIVE")?._count.id ?? 0,
        inProgress: statusCounts
          .filter((s) => ["IN_PROGRESS", "CONTRACT_SIGNED", "PDI_PHASE"].includes(s.status))
          .reduce((sum, s) => sum + s._count.id, 0),
      },
    });
  });
}
