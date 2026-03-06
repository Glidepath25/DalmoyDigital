import { NextResponse } from "next/server";

import { requireApiUserId } from "@/lib/api/auth";
import { getAccessSnapshot } from "@/lib/rbac";

export async function GET() {
  const auth = await requireApiUserId();
  if (!auth.ok) return auth.response;

  const access = await getAccessSnapshot(auth.userId);
  return NextResponse.json({
    userId: auth.userId,
    roles: access.roleKeys,
    permissions: access.permissionKeys
  });
}

