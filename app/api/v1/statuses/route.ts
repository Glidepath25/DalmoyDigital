import { NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const statuses = await db.projectStatus.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(
    statuses.map((s) => ({
      id: s.id,
      name: s.name,
      sortOrder: s.sortOrder
    }))
  );
}

