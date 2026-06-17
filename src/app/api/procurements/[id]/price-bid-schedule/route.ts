import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute, jsonOk } from "@/lib/api/response";
import { updatePriceBidSchedule } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  priceBidOpenDate: z.string().min(1),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const result = await updatePriceBidSchedule(id, body.priceBidOpenDate, user.id);
    return jsonOk(result);
  });
}
