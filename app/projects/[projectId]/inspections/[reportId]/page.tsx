import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { addInspectionItem } from "./actions";

type PageProps = { params: { projectId: string; reportId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function InspectionReportPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const saved = toString(props.searchParams?.saved) === "1";
  const created = toString(props.searchParams?.created) === "1";
  const error = toString(props.searchParams?.error);

  const report = await db.siteInspectionReport.findFirst({
    where: { id: props.params.reportId, projectId: props.params.projectId },
    include: { completedByUser: true, items: { include: { photoFile: true }, orderBy: { createdAt: "desc" } } }
  });
  if (!report) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title="Inspection report"
          subtitle={`${format(report.inspectionDate, "yyyy-MM-dd HH:mm")} • ${report.projectReferenceSnapshot}`}
        />
        <Link href={`/projects/${props.params.projectId}/inspections`}>
          <Button variant="secondary" type="button">
            Back to reports
          </Button>
        </Link>
      </div>

      {created ? <p className="text-sm font-semibold text-semantic-success">Report created.</p> : null}
      {saved ? <p className="text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <SectionCard
            title="Inspection items"
            subtitle="Record observations, add comments, and attach a photo."
            actions={<Badge tone="neutral">{report.items.length} items</Badge>}
          >
            {report.items.length === 0 ? (
              <EmptyState title="No items yet" description="Add the first inspection item to this report." />
            ) : (
              <div className="space-y-3">
                {report.items.map((it) => (
                  <div key={it.id} className="dd-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-primary">{it.itemTitle}</p>
                        {it.comment ? <p className="mt-1 text-sm text-brand-secondary">{it.comment}</p> : null}
                        <p className="mt-2 text-xs text-brand-secondary">Added {format(it.createdAt, "yyyy-MM-dd HH:mm")}</p>
                      </div>
                      {it.photoFileId ? (
                        <div className="w-40">
                          {/* Served via API route with auth */}
                          <img
                            className="w-40 h-28 object-cover rounded-lg border border-app-border bg-app-bg"
                            src={`/api/v1/files/${it.photoFileId}`}
                            alt={it.photoFile?.originalName ?? "Inspection photo"}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <SectionCard title="Report details">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Completed by</dt>
                <dd className="text-brand-primary font-semibold text-right">
                  {report.completedByUser ? report.completedByUser.name ?? report.completedByUser.email : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Inspection date</dt>
                <dd className="text-brand-primary font-semibold text-right">
                  {format(report.inspectionDate, "yyyy-MM-dd HH:mm")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Project code</dt>
                <dd className="text-brand-primary font-semibold text-right">{report.projectReferenceSnapshot}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Add item"
            subtitle={canEdit ? "Record a new item for this report." : "You don’t have permission to add items."}
          >
            <form action={addInspectionItem.bind(null, props.params.projectId, report.id)} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Recorded item</label>
                <Input className="mt-1" disabled={!canEdit} name="itemTitle" placeholder="e.g. Fire stopping incomplete" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Comment</label>
                <Textarea className="mt-1 min-h-[88px]" disabled={!canEdit} name="comment" placeholder="Optional comment..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Photo</label>
                <Input className="mt-1" disabled={!canEdit} name="photo" type="file" />
              </div>
              <Button disabled={!canEdit} type="submit">
                Add item
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

