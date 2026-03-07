import { format } from "date-fns";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { csvResponse, toCsv } from "@/lib/export/csv";

type RouteContext = { params: { projectId: string } };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const project = await db.project.findUnique({ where: { id: ctx.params.projectId }, select: { reference: true } });
  if (!project) return new Response("not_found", { status: 404 });

  const items = await db.projectActionItem.findMany({
    where: { projectId: ctx.params.projectId },
    include: { ownerUser: true, statusOption: true, priorityOption: true },
    orderBy: [{ requiredClosureDate: "asc" }, { createdAt: "desc" }]
  });

  const rows: Array<Array<string | number | null>> = [
    ["Action / Item", "Status", "Priority", "Owner", "Required Closure", "Actual Closure", "Created At"],
    ...items.map((it) => [
      it.title,
      it.statusOption?.label ?? "",
      it.priorityOption?.label ?? "",
      it.ownerUser ? it.ownerUser.name ?? it.ownerUser.email : "",
      it.requiredClosureDate ? format(it.requiredClosureDate, "yyyy-MM-dd") : "",
      it.actualClosureDate ? format(it.actualClosureDate, "yyyy-MM-dd") : "",
      format(it.createdAt, "yyyy-MM-dd HH:mm")
    ])
  ];

  const csv = toCsv(rows);
  return csvResponse({ filename: `${project.reference}_critical_actions.csv`, csv });
}

