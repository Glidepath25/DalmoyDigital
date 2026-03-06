import { cache } from "react";

import { db } from "@/lib/db";

export type AccessSnapshot = {
  roleKeys: string[];
  permissionKeys: string[];
};

export const getAccessSnapshot = cache(async (userId: string): Promise<AccessSnapshot> => {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } }
        }
      }
    }
  });

  const roleKeys = userRoles.map((r) => r.role.key);
  const permissionKeys = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) permissionKeys.add(rp.permission.key);
  }

  return { roleKeys, permissionKeys: Array.from(permissionKeys) };
});

export async function hasPermission(userId: string, permissionKey: string) {
  const access = await getAccessSnapshot(userId);
  return access.permissionKeys.includes(permissionKey);
}

