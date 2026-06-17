import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
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
    await requirePermission(request, "settings.manage");
    const body = z.record(z.string(), z.unknown()).parse(await request.json());
    for (const [key, value] of Object.entries(body)) {
      await saveSetting(key, value);
    }
    return jsonOk(await loadSettings());
  });
}
