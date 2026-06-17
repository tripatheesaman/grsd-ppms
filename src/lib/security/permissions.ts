import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function isHardDeniedForRole(role: Role, permissionKey: string): boolean {
  if (role !== Role.ADMIN) return false;
  return (
    permissionKey === "audit.view" ||
    permissionKey === "users.view" ||
    permissionKey === "users.manage"
  );
}

export async function userHasPermission(
  userId: string,
  role: Role,
  permissionKey: string,
): Promise<boolean> {
  if (role === Role.SUPERADMIN) return true;
  if (isHardDeniedForRole(role, permissionKey)) return false;

  const userOverride = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: { key: permissionKey },
    },
    include: { permission: true },
  });
  if (userOverride) return userOverride.allowed;

  const rolePerm = await prisma.rolePermission.findFirst({
    where: {
      role,
      permission: { key: permissionKey },
    },
  });
  return rolePerm?.allowed ?? false;
}

export async function getUserPermissions(userId: string, role: Role) {
  if (role === Role.SUPERADMIN) {
    const all = await prisma.permission.findMany();
    return all.map((p) => ({ key: p.key, allowed: true }));
  }

  const permissions = await prisma.permission.findMany({ orderBy: { key: "asc" } });
  const result: Array<{ key: string; allowed: boolean }> = [];

  for (const perm of permissions) {
    if (isHardDeniedForRole(role, perm.key)) {
      result.push({ key: perm.key, allowed: false });
      continue;
    }
    const allowed = await userHasPermission(userId, role, perm.key);
    result.push({ key: perm.key, allowed });
  }
  return result;
}
