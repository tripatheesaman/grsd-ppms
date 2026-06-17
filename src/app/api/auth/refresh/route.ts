import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { REFRESH_COOKIE, REFRESH_TOKEN_TTL_MS } from "@/lib/security/constants";
import { sha256 } from "@/lib/security/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/security/jwt";
import { getUserPermissions } from "@/lib/security/permissions";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const cookieToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!cookieToken) {
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token required");
    }

    let payload;
    try {
      payload = verifyRefreshToken(cookieToken);
    } catch {
      throw new ApiError(401, "INVALID_TOKEN", "Invalid refresh token");
    }

    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: sha256(cookieToken),
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) {
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = signAccessToken({
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });
    const refreshToken = signRefreshToken(stored.user.id);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        tokenHash: sha256(refreshToken),
        expiresAt,
      },
    });

    const permissions = await getUserPermissions(stored.user.id, stored.user.role);
    const response = jsonOk({
      accessToken,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        fullName: stored.user.fullName,
        role: stored.user.role,
        permissions,
      },
    });
    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return response;
  });
}
