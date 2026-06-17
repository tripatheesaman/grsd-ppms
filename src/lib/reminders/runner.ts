import { startOfDay, subDays } from "date-fns";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { loadCalendarContext } from "@/lib/calendar/load-context";
import { loadSettings } from "@/lib/settings";
import {
  evaluateMilestoneReminder,
  getMilestoneDate,
  isKnownMilestoneKey,
  parseRemindDaysBefore,
  type MilestoneProcurement,
} from "@/lib/reminders/milestones";

export async function runReminders() {
  const today = startOfDay(new Date());
  const rules = await prisma.reminderRule.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  const procurements = await prisma.procurement.findMany({
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
    },
  });

  const smtp = await prisma.smtpSetting.findFirst({ where: { isActive: true } });
  const emailTemplate = await prisma.emailTemplate.findUnique({ where: { key: "reminder" } });
  const users = await prisma.user.findMany({ where: { isActive: true } });
  const settings = await loadSettings();
  const calendar = await loadCalendarContext();

  let sent = 0;

  for (const proc of procurements) {
    const milestoneProc: MilestoneProcurement = proc;
    for (const rule of rules) {
      if (!isKnownMilestoneKey(rule.milestoneKey)) continue;

      const evaluated = evaluateMilestoneReminder(milestoneProc, rule.milestoneKey, rule, today, {
        loaDelayDays: rule.offsetWorkingDays ?? settings.loaDelayDays,
        calendar,
      });
      if (!evaluated) continue;

      const { severity, targetDate: dateStr } = evaluated;
      const target = getMilestoneDate(milestoneProc, rule.milestoneKey, {
        loaDelayDays: rule.offsetWorkingDays ?? settings.loaDelayDays,
        calendar,
      });
      if (!target) continue;

      const repeatEveryDays = rule.repeatEveryDays ?? 0;
      const existing = await prisma.reminderLog.findFirst({
        where: {
          procurementId: proc.id,
          milestoneKey: rule.milestoneKey,
          targetDate: target,
        },
        orderBy: { sentAt: "desc" },
      });

      if (existing) {
        if (repeatEveryDays <= 0) continue;
        const minNext = subDays(today, repeatEveryDays);
        if (existing.sentAt > minNext) continue;
      }

      await prisma.reminderLog.create({
        data: {
          procurementId: proc.id,
          milestoneKey: rule.milestoneKey,
          severity,
          targetDate: target,
        },
      });

      if (rule.notifyInApp !== false) {
        for (const user of users) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: `${rule.label} — ${severity}`,
              message: `Procurement "${proc.title}" — ${rule.label} on ${dateStr} (${evaluated.daysUntil} day(s) remaining)`,
              link: `/procurements/${proc.id}`,
            },
          });
        }
      }

      if (rule.sendEmail && smtp && emailTemplate) {
        try {
          const transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: { user: smtp.username, pass: smtp.password },
          });
          const remindDays = parseRemindDaysBefore(rule).join(", ");
          const body = emailTemplate.bodyHtml
            .replace(/\{\{title\}\}/g, proc.title)
            .replace(/\{\{milestone\}\}/g, rule.label)
            .replace(/\{\{date\}\}/g, dateStr)
            .replace(/\{\{severity\}\}/g, severity)
            .replace(/\{\{days_until\}\}/g, String(evaluated.daysUntil))
            .replace(/\{\{remind_days\}\}/g, remindDays);
          for (const user of users) {
            await transport.sendMail({
              from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
              to: user.email,
              subject: emailTemplate.subject.replace(/\{\{milestone\}\}/g, rule.label),
              html: body,
            });
          }
        } catch (err) {
          logger.error({ err }, "Failed to send reminder email");
        }
      }
      sent += 1;
    }
  }

  return { sent };
}

export async function closeExpiredBidOpenDays() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const updated = await prisma.procurement.updateMany({
    where: {
      status: "BID_OPEN_DAY",
      bidOpenAcknowledgedAt: { lte: yesterday },
    },
    data: { status: "BID_CLOSED" },
  });
  return updated.count;
}
