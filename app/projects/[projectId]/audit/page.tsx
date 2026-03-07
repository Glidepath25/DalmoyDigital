import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AuditTrailPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const q = (toString(props.searchParams?.q) ?? "").trim();

  const entries = await db.projectAuditTrailEntry.findMany({
    where: {
      projectId: project.id,
      ...(q
        ? {
            OR: [
              { entityType: { contains: q, mode: "insensitive" } },
              { actionType: { contains: q, mode: "insensitive" } },
              { fieldName: { contains: q, mode: "insensitive" } },
              { summary: { contains: q, mode: "insensitive" } },
              { oldValue: { contains: q, mode: "insensitive" } },
              { newValue: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { performedByUser: true },
    orderBy: [{ performedAt: "desc" }],
    take: 300
  });

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Audit Trail"
        subtitle="Accountability log of key changes across the project workspace."
        actions={
          <form className="flex items-center gap-2">
            <Input className="w-56" defaultValue={q} name="q" placeholder="Search audit..." />
            <Badge tone="neutral">{entries.length}</Badge>
          </form>
        }
      >
        {entries.length === 0 ? (
          <EmptyState title="No audit entries yet" description="Updates across the workspace will be logged here." />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Old</th>
                  <th className="px-3 py-2">New</th>
                  <th className="px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-app-border hover:bg-app-bg/50">
                    <td className="px-3 py-2 whitespace-nowrap">{format(e.performedAt, "yyyy-MM-dd HH:mm")}</td>
                    <td className="px-3 py-2">
                      {e.performedByUser ? e.performedByUser.name ?? e.performedByUser.email : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="neutral">{e.entityType}</Badge>
                      {e.entityId ? <p className="mt-1 text-xs text-brand-secondary">{e.entityId}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone="neutral">{e.actionType}</Badge>
                    </td>
                    <td className="px-3 py-2">{e.fieldName ?? "—"}</td>
                    <td className="px-3 py-2">{e.oldValue ?? "—"}</td>
                    <td className="px-3 py-2">{e.newValue ?? "—"}</td>
                    <td className="px-3 py-2">{e.summary ?? "—"}</td>
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

