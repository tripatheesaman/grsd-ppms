import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import {
  ensureReminderRulesFromCatalog,
  serializeReminderRule,
} from "@/lib/reminders/sync-rules";
import { requirePermission } from "@/lib/security/auth-guard";

const ruleSchema = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  upcomingDays: z.number().int().min(0).optional(),
  almostDueDays: z.number().int().min(0).optional(),
  criticalDays: z.number().int().min(0).optional(),
  remindDaysBefore: z.array(z.number().int().min(0)).optional(),
  repeatEveryDays: z.number().int().min(0).optional(),
  notifyInApp: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  offsetWorkingDays: z.number().int().min(0).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    await ensureReminderRulesFromCatalog();
    const rows = await prisma.reminderRule.findMany({ orderBy: { sortOrder: "asc" } });
    return jsonOk(rows.map(serializeReminderRule));
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = z.array(ruleSchema).parse(await request.json());

    for (const item of body) {
      const { id, remindDaysBefore, ...rest } = item;
      await prisma.reminderRule.update({
        where: { id },
        data: {
          ...rest,
          ...(remindDaysBefore !== undefined ? { remindDaysBefore } : {}),
        },
      });
    }
    return jsonOk({ success: true });
  });
}
