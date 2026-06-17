import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { AuditAction } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { REFRESH_COOKIE, REFRESH_TOKEN_TTL_MS } from "@/lib/security/constants";
import { sha256 } from "@/lib/security/hash";
import { signAccessToken, signRefreshToken } from "@/lib/security/jwt";
import { getUserPermissions } from "@/lib/security/permissions";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.isActive) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const valid = await compare(body.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    await writeAudit({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: "user",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    const permissions = await getUserPermissions(user.id, user.role);
    const response = jsonOk({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
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
