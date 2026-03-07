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

  const milestones = await db.projectMilestone.findMany({
    where: { projectId: ctx.params.projectId },
    include: { ragOption: true },
    orderBy: [{ sortOrder: "asc" }, { milestoneName: "asc" }]
  });

  const rows: Array<Array<string | number | null>> = [
    ["Milestone", "RAG", "Program Start", "Duration (days)", "Program Finish", "Forecast Start", "Forecast Finish"],
    ...milestones.map((m) => [
      m.milestoneName,
      m.ragOption?.label ?? "",
      m.programStart ? format(m.programStart, "yyyy-MM-dd") : "",
      m.durationDays ?? "",
      m.programFinish ? format(m.programFinish, "yyyy-MM-dd") : "",
      m.forecastStart ? format(m.forecastStart, "yyyy-MM-dd") : "",
      m.forecastFinish ? format(m.forecastFinish, "yyyy-MM-dd") : ""
    ])
  ];

  const csv = toCsv(rows);
  return csvResponse({ filename: `${project.reference}_programme.csv`, csv });
}

