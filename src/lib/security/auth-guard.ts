import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/security/jwt";
import { userHasPermission } from "@/lib/security/permissions";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
};

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "UNAUTHORIZED", "User not found or inactive");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };
}

export async function requirePermission(request: NextRequest, permissionKey: string) {
  const user = await requireAuth(request);
  const allowed = await userHasPermission(user.id, user.role, permissionKey);
  if (!allowed) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }
  return user;
}

export async function requireAnyPermission(request: NextRequest, permissionKeys: string[]) {
  const user = await requireAuth(request);
  for (const key of permissionKeys) {
    if (await userHasPermission(user.id, user.role, key)) {
      return user;
    }
  }
  throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
}
