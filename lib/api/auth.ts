import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { hasPermission } from "@/lib/rbac";

export async function requireApiUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { ok: true as const, userId };
}

export async function requireApiPermission(permissionKey: string) {
  const auth = await requireApiUserId();
  if (!auth.ok) return auth;
  const ok = await hasPermission(auth.userId, permissionKey);
  if (!ok) return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return auth;
}

