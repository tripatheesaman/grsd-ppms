import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute, jsonOk } from "@/lib/api/response";
import { saveCommitteeDecision } from "@/lib/procurement/committee-decision";
import { requirePermission } from "@/lib/security/auth-guard";

const amountLineSchema = z.object({
  currencyId: z.string().min(1),
  amount: z.coerce.number().positive(),
  forexRate: z.coerce.number().positive().optional().nullable(),
});

const schema = z.object({
  winnerBidderId: z.string().min(1),
  bidCurrencyId: z.string().min(1),
  paymentConditionId: z.string().min(1),
  bidAmountWithoutVatLines: z.array(amountLineSchema).min(1),
  bidAmountWithVatLines: z.array(amountLineSchema).optional().default([]),
  warrantyDays: z.coerce.number().int().min(0),
  workDays: z.array(
    z.object({
      workDayCategoryId: z.string().min(1),
      days: z.coerce.number().int().min(0),
    }),
  ),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const result = await saveCommitteeDecision(id, body, user.id);
    return jsonOk(result);
  });
}
