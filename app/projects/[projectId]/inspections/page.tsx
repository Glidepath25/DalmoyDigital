import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function InspectionsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const reports = await db.siteInspectionReport.findMany({
    where: { projectId: project.id },
    include: { completedByUser: true, items: { select: { isSnag: true } } },
    orderBy: [{ inspectionDate: "desc" }]
  });

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Site Inspection Reports"
        subtitle="Capture site observations with comments and photos."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{reports.length} reports</Badge>
            {canEdit ? (
              <Link href={`/projects/${project.id}/inspections/new`}>
                <Button type="button">Complete site inspection</Button>
              </Link>
            ) : null}
          </div>
        }
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        {reports.length === 0 ? (
          <EmptyState
            title="No inspection reports yet"
            description={canEdit ? "Complete the first inspection report for this project." : "No inspection reports are available for this project."}
            actionHref={canEdit ? `/projects/${project.id}/inspections/new` : undefined}
            actionLabel={canEdit ? "Complete site inspection" : undefined}
          />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="dd-table">
              <thead>
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">Inspection date</th>
                  <th className="px-3 py-2">Completed by</th>
                  <th className="px-3 py-2">Project code</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Snags</th>
                  <th className="px-3 py-2 text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t border-app-border hover:bg-app-bg/50">
                    <td className="px-3 py-2 font-semibold text-brand-primary">{format(r.inspectionDate, "yyyy-MM-dd HH:mm")}</td>
                    <td className="px-3 py-2">{r.completedByUser ? r.completedByUser.name ?? r.completedByUser.email : "-"}</td>
                    <td className="px-3 py-2">{r.projectReferenceSnapshot}</td>
                    <td className="px-3 py-2">
                      <Badge tone="neutral">{r.items.length}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={r.items.some((it) => it.isSnag) ? "warning" : "neutral"}>
                        {r.items.filter((it) => it.isSnag).length}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link className="dd-link" href={`/projects/${project.id}/inspections/${r.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}



