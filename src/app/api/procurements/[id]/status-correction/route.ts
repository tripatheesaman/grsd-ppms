import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  correctProcurementStatus,
  type StatusCorrectionAction,
} from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  action: z.enum(["STEP_BACK", "CANCEL", "REOPEN_COMPLETED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    if (user.role !== "SUPERADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Only SUPERADMIN can correct status");
    }
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const result = await correctProcurementStatus(
      id,
      body.action as StatusCorrectionAction,
      user.id,
    );
    return jsonOk(result);
  });
}
