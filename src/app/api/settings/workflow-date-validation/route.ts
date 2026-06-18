import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRoute, jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import {
  isWorkflowDateValidationEnabled,
  setWorkflowDateValidationEnabled,
} from "@/lib/procurement/workflow-date-validation";
import { requireAuth } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireAuth(request);
    const enabled = await isWorkflowDateValidationEnabled();
    return jsonOk({ enabled });
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    if (user.role !== "SUPERADMIN") {
      throw new ApiError(403, "FORBIDDEN", "Only SUPERADMIN can change workflow date validation");
    }
    const body = z.object({ enabled: z.boolean() }).parse(await request.json());
    await setWorkflowDateValidationEnabled(body.enabled);
    return jsonOk({ enabled: body.enabled });
  });
}
