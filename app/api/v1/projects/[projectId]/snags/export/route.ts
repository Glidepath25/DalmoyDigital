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

  const snags = await db.projectSnag.findMany({
    where: { projectId: ctx.params.projectId },
    include: { statusOption: true, priorityOption: true, responsibleUser: true },
    orderBy: [{ dateRaised: "desc" }]
  });

  const rows: Array<Array<string | number | null>> = [
    [
      "Title",
      "Description",
      "Status",
      "Priority",
      "Responsible Party",
      "Date Raised",
      "Target Closure",
      "Date Rectified",
      "Date Closed"
    ],
    ...snags.map((s) => [
      s.title,
      s.description ?? "",
      s.statusOption?.label ?? "",
      s.priorityOption?.label ?? "",
      s.responsibleUser ? s.responsibleUser.name ?? s.responsibleUser.email : "",
      format(s.dateRaised, "yyyy-MM-dd"),
      s.targetClosureDate ? format(s.targetClosureDate, "yyyy-MM-dd") : "",
      s.dateRectified ? format(s.dateRectified, "yyyy-MM-dd") : "",
      s.dateClosed ? format(s.dateClosed, "yyyy-MM-dd") : ""
    ])
  ];

  const csv = toCsv(rows);
  return csvResponse({ filename: `${project.reference}_snags.csv`, csv });
}

