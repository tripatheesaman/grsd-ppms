import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { loadSettings, saveSetting } from "@/lib/settings";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const settings = await loadSettings();
    return jsonOk(settings);
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "settings.manage");
    const body = z.record(z.string(), z.unknown()).parse(await request.json());
    if ("workflowDateValidationEnabled" in body && user.role !== "SUPERADMIN") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Only SUPERADMIN can change workflow date validation",
      );
    }
    for (const [key, value] of Object.entries(body)) {
      await saveSetting(key, value);
    }
    return jsonOk(await loadSettings());
  });
}
