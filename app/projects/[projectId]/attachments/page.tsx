import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { uploadAttachment } from "./actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function formatBytes(n: number | null | undefined) {
  if (!n || n <= 0) return "-";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default async function AttachmentsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const [attachments, categoryType] = await Promise.all([
    db.projectAttachment.findMany({
      where: { projectId: project.id },
      include: { file: true, categoryOption: true, uploadedBy: true },
      orderBy: [{ createdAt: "desc" }]
    }),
    db.lookupType.findUnique({
      where: { key: "attachment_category" },
      include: {
        options: {
          where: { isActive: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
        }
      }
    })
  ]);

  const categoryOptions = categoryType?.options ?? [];

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Attachments"
        subtitle="Local uploads for now, with a storage abstraction ready for S3/Spaces later."
        actions={<Badge tone="neutral">{attachments.length} files</Badge>}
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        {canEdit ? (
          <div className="dd-card p-4 mb-3">
            <p className="text-sm font-semibold text-brand-primary">Upload attachment</p>
            <form action={uploadAttachment.bind(null, project.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="text-xs font-semibold text-brand-secondary">File</label>
                <Input className="mt-1" name="file" type="file" />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-brand-secondary">Category</label>
                <Select className="mt-1" name="categoryOptionId">
                  <option value="">-</option>
                  {categoryOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button className="w-full" type="submit">
                  Upload
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-xs text-brand-secondary">You don't have permission to upload attachments.</p>
        )}

        {attachments.length === 0 ? (
          <EmptyState title="No attachments yet" description="Upload drawings, RFIs, photos, and handover documents." />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="dd-table">
              <thead>
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">File name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Uploaded by</th>
                  <th className="px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a) => (
                  <tr key={a.id} className="border-t border-app-border hover:bg-app-bg/50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-brand-primary">{a.file.originalName}</p>
                      <p className="text-xs text-brand-secondary">{a.file.mimeType ?? "-"}</p>
                    </td>
                    <td className="px-3 py-2">{a.categoryOption ? <Badge tone="neutral">{a.categoryOption.label}</Badge> : "-"}</td>
                    <td className="px-3 py-2">{a.uploadedBy ? a.uploadedBy.name ?? a.uploadedBy.email : "-"}</td>
                    <td className="px-3 py-2">{format(a.createdAt, "yyyy-MM-dd HH:mm")}</td>
                    <td className="px-3 py-2">{formatBytes(a.file.sizeBytes)}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        className="dd-link"
                        href={`/api/v1/attachments/${a.id}/download`}
                      >
                        Download
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



