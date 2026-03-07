import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { DownloadLink } from "@/components/app/download-link";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { createCorrespondence, deleteCorrespondence } from "./actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProjectCorrespondencePage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const q = (toString(props.searchParams?.q) ?? "").trim();
  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const correspondence = await db.projectCorrespondence.findMany({
    where: {
      projectId: project.id,
      ...(q
        ? {
            OR: [
              { fromAddress: { contains: q, mode: "insensitive" } },
              { toAddress: { contains: q, mode: "insensitive" } },
              { subject: { contains: q, mode: "insensitive" } },
              { aiSummary: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { occurredAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Correspondence"
        subtitle="Manual entries now, ready for future inbound email integration."
        actions={
          <div className="flex items-center gap-2">
            <form className="flex items-center gap-2" action="">
              <Input className="w-56" defaultValue={q} name="q" placeholder="Search subject, from, to..." />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
            <DownloadLink href={`/api/v1/projects/${project.id}/correspondence/export`} label="Export CSV" />
          </div>
        }
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        {canEdit ? (
          <div className="dd-card p-4 mb-3">
            <p className="text-sm font-semibold text-brand-primary">Add correspondence</p>
            <form action={createCorrespondence.bind(null, project.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-brand-secondary">From</label>
                <Input className="mt-1" name="fromAddress" placeholder="from@example.com" />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-brand-secondary">To</label>
                <Input className="mt-1" name="toAddress" placeholder="to@example.com" />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-brand-secondary">Subject</label>
                <Input className="mt-1" name="subject" placeholder="Subject" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Date</label>
                <Input className="mt-1" name="occurredAt" type="datetime-local" />
              </div>
              <div className="md:col-span-10">
                <label className="text-xs font-semibold text-brand-secondary">AI summary (placeholder)</label>
                <Textarea className="mt-1 min-h-[72px]" name="aiSummary" placeholder="Summary..." />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button className="w-full" type="submit">
                  Add
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-xs text-brand-secondary">You don’t have permission to add correspondence.</p>
        )}

        <div className="dd-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-app-bg">
              <tr className="text-left text-xs font-semibold text-brand-secondary">
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">AI Summary</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {correspondence.map((c) => (
                <tr key={c.id} className="border-t border-app-border hover:bg-app-bg/50">
                  <td className="px-3 py-2">
                    <span className="font-semibold text-brand-primary">{c.fromAddress}</span>
                  </td>
                  <td className="px-3 py-2">{c.toAddress}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-brand-primary">{c.subject}</p>
                    <p className="text-xs text-brand-secondary">{c.sourceType}</p>
                  </td>
                  <td className="px-3 py-2">
                    {c.aiSummary ? (
                      <p className="text-brand-secondary line-clamp-2">{c.aiSummary}</p>
                    ) : (
                      <Badge tone="neutral">—</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">{format(c.occurredAt, "yyyy-MM-dd HH:mm")}</td>
                  <td className="px-3 py-2 text-right">
                    {canEdit ? (
                      <form action={deleteCorrespondence.bind(null, project.id, c.id)}>
                        <Button variant="danger" type="submit">
                          Delete
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-brand-secondary">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {correspondence.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No correspondence yet" description="Add a manual entry or connect an inbound email integration later." />
            </div>
          ) : null}
        </div>
      </DataTableShell>
    </div>
  );
}
