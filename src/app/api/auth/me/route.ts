import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { requireAuth } from "@/lib/security/auth-guard";
import { getUserPermissions } from "@/lib/security/permissions";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const permissions = await getUserPermissions(user.id, user.role);
    return jsonOk({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions,
    });
  });
}
