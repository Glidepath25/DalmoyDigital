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

  const correspondence = await db.projectCorrespondence.findMany({
    where: { projectId: ctx.params.projectId },
    orderBy: { occurredAt: "desc" },
    take: 1000
  });

  const rows: Array<Array<string | number | null>> = [
    ["From", "To", "Subject", "AI Summary", "Date"],
    ...correspondence.map((c) => [c.fromAddress, c.toAddress, c.subject, c.aiSummary ?? "", format(c.occurredAt, "yyyy-MM-dd HH:mm")])
  ];

  const csv = toCsv(rows);
  return csvResponse({ filename: `${project.reference}_correspondence.csv`, csv });
}

