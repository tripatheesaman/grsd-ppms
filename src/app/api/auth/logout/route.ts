import { NextRequest } from "next/server";
import { AuditAction } from "@prisma/client";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/auth-guard";
import { REFRESH_COOKIE } from "@/lib/security/constants";
import { sha256 } from "@/lib/security/hash";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const cookieToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (cookieToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(cookieToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await writeAudit({
      userId: user.id,
      action: AuditAction.LOGOUT,
      entityType: "user",
      entityId: user.id,
    });
    const response = jsonOk({ success: true });
    response.cookies.set(REFRESH_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  });
}
