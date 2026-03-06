import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";

export async function requirePermission(permissionKey: string) {
  const userId = await requireUserId();
  const ok = await hasPermission(userId, permissionKey);
  if (!ok) redirect("/dashboard");
  return userId;
}

