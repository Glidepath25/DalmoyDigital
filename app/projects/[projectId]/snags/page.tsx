import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { createSnag, updateSnag, uploadSnagPhoto } from "./actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toDateInputValue(d: Date | null | undefined) {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

function badgeToneFromValue(v: string | null | undefined) {
  const value = (v ?? "").toLowerCase();
  if (value.includes("closed")) return "success" as const;
  if (value.includes("rectified")) return "warning" as const;
  if (value.includes("additional")) return "danger" as const;
  if (value.includes("critical") || value.includes("high")) return "danger" as const;
  if (value.includes("medium")) return "warning" as const;
  if (value.includes("low")) return "neutral" as const;
  return "neutral" as const;
}

export default async function SnagsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const statusId = (toString(props.searchParams?.status) ?? "").trim();
  const priorityId = (toString(props.searchParams?.priority) ?? "").trim();
  const responsibleId = (toString(props.searchParams?.responsible) ?? "").trim();
  const overdue = toString(props.searchParams?.overdue) === "1";

  const [snags, statusType, priorityType, users] = await Promise.all([
    db.projectSnag.findMany({
      where: {
        projectId: project.id,
        ...(statusId ? { statusOptionId: statusId } : {}),
        ...(priorityId ? { priorityOptionId: priorityId } : {}),
        ...(responsibleId ? { responsibleUserId: responsibleId } : {}),
        ...(overdue
          ? {
              targetClosureDate: { lt: new Date() },
              dateClosed: null
            }
          : {})
      },
      include: {
        statusOption: true,
        priorityOption: true,
        responsibleUser: true,
        attachments: { include: { file: true } }
      },
      orderBy: [{ dateRaised: "desc" }],
      take: 300
    }),
    db.lookupType.findUnique({
      where: { key: "snag_status" },
      include: {
        options: { where: { isActive: true, archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }
      }
    }),
    db.lookupType.findUnique({
      where: { key: "snag_priority" },
      include: {
        options: { where: { isActive: true, archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }
      }
    }),
    db.user.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }, { email: "asc" }] })
  ]);

  const statusOptions = statusType?.options ?? [];
  const priorityOptions = priorityType?.options ?? [];

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Snag List"
        subtitle="Commercial defect management workflow with assignment, evidence, rectification, and close-out."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{snags.length} snags</Badge>
            <Link className="text-sm font-semibold text-brand-accent hover:underline" href={`/projects/${project.id}/inspections`}>
              Raise via inspection →
            </Link>
          </div>
        }
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        <div className="dd-card p-4 mb-3">
          <p className="text-sm font-semibold text-brand-primary">Filters</p>
          <form className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-brand-secondary">Status</label>
              <Select className="mt-1" defaultValue={statusId} name="status">
                <option value="">All</option>
                {statusOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-brand-secondary">Priority</label>
              <Select className="mt-1" defaultValue={priorityId} name="priority">
                <option value="">All</option>
                {priorityOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-brand-secondary">Responsible party</label>
              <Select className="mt-1" defaultValue={responsibleId} name="responsible">
                <option value="">All</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-brand-secondary">Overdue</label>
              <Select className="mt-1" defaultValue={overdue ? "1" : ""} name="overdue">
                <option value="">All</option>
                <option value="1">Overdue only</option>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button className="w-full" type="submit" variant="secondary">
                Apply
              </Button>
            </div>
          </form>
        </div>

        {canEdit ? (
          <div className="dd-card p-4 mb-3">
            <p className="text-sm font-semibold text-brand-primary">Create snag</p>
            <form action={createSnag.bind(null, project.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-brand-secondary">Title</label>
                <Input className="mt-1" name="title" placeholder="Snag title..." />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-brand-secondary">Status</label>
                <Select className="mt-1" name="statusOptionId">
                  <option value="">—</option>
                  {statusOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-brand-secondary">Priority</label>
                <Select className="mt-1" name="priorityOptionId">
                  <option value="">—</option>
                  {priorityOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Target closure</label>
                <Input className="mt-1" name="targetClosureDate" type="date" />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-brand-secondary">Responsible party</label>
                <Select className="mt-1" name="responsibleUserId">
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-8">
                <label className="text-xs font-semibold text-brand-secondary">Description / comment</label>
                <Textarea className="mt-1 min-h-[72px]" name="description" placeholder="Optional description..." />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button className="w-full" type="submit">
                  Create
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-xs text-brand-secondary">You don’t have permission to create snags.</p>
        )}

        {snags.length === 0 ? (
          <EmptyState title="No snags yet" description="Raise snags during a site inspection or create one manually." />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Responsible</th>
                  <th className="px-3 py-2">Raised</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Evidence</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snags.map((s) => {
                  const isOverdue = !!s.targetClosureDate && !s.dateClosed && s.targetClosureDate.getTime() < Date.now();
                  return (
                    <tr key={s.id} className="border-t border-app-border hover:bg-app-bg/50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-brand-primary">{s.title}</p>
                        {s.description ? <p className="mt-1 text-xs text-brand-secondary">{s.description}</p> : null}
                        {isOverdue ? <p className="mt-1 text-xs font-semibold text-semantic-danger">Overdue</p> : null}
                      </td>
                      <td className="px-3 py-2">
                        {s.statusOption ? (
                          <Badge tone={badgeToneFromValue(s.statusOption.value)}>{s.statusOption.label}</Badge>
                        ) : (
                          <Badge tone="neutral">—</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {s.priorityOption ? (
                          <Badge tone={badgeToneFromValue(s.priorityOption.value)}>{s.priorityOption.label}</Badge>
                        ) : (
                          <Badge tone="neutral">—</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">{s.responsibleUser ? s.responsibleUser.name ?? s.responsibleUser.email : "—"}</td>
                      <td className="px-3 py-2">{format(s.dateRaised, "yyyy-MM-dd")}</td>
                      <td className="px-3 py-2">{s.targetClosureDate ? format(s.targetClosureDate, "yyyy-MM-dd") : "—"}</td>
                      <td className="px-3 py-2">
                        <Badge tone="neutral">{s.attachments.length}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit ? (
                          <details className="inline-block text-left">
                            <summary className="cursor-pointer text-sm font-semibold text-brand-accent hover:underline">
                              Manage
                            </summary>
                            <div className="mt-2 dd-card p-3 w-[720px]">
                              <form action={updateSnag.bind(null, project.id, s.id)} className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-brand-secondary">Title</label>
                                  <Input className="mt-1" defaultValue={s.title} name="title" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-brand-secondary">Description / comment</label>
                                  <Textarea className="mt-1 min-h-[72px]" defaultValue={s.description ?? ""} name="description" />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Status</label>
                                  <Select className="mt-1" defaultValue={s.statusOptionId ?? ""} name="statusOptionId">
                                    <option value="">—</option>
                                    {statusOptions.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Priority</label>
                                  <Select className="mt-1" defaultValue={s.priorityOptionId ?? ""} name="priorityOptionId">
                                    <option value="">—</option>
                                    {priorityOptions.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Responsible party</label>
                                  <Select className="mt-1" defaultValue={s.responsibleUserId ?? ""} name="responsibleUserId">
                                    <option value="">—</option>
                                    {users.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.name ? `${u.name} (${u.email})` : u.email}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Target closure</label>
                                  <Input className="mt-1" defaultValue={toDateInputValue(s.targetClosureDate)} name="targetClosureDate" type="date" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-brand-secondary">Internal close-out comment</label>
                                  <Textarea className="mt-1 min-h-[64px]" defaultValue={s.internalCloseOutComment ?? ""} name="internalCloseOutComment" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-brand-secondary">Additional work required comment</label>
                                  <Textarea className="mt-1 min-h-[64px]" defaultValue={s.additionalWorkRequiredComment ?? ""} name="additionalWorkRequiredComment" />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                  <Button type="submit">Save</Button>
                                </div>
                              </form>

                              <div className="mt-3 border-t border-app-border pt-3">
                                <p className="text-sm font-semibold text-brand-primary">Photo evidence</p>
                                <form action={uploadSnagPhoto.bind(null, project.id, s.id)} className="mt-2 flex items-end gap-2">
                                  <div className="flex-1">
                                    <label className="text-xs font-semibold text-brand-secondary">Upload photo</label>
                                    <Input className="mt-1" name="photo" type="file" />
                                  </div>
                                  <Button type="submit">Upload</Button>
                                </form>
                                {s.attachments.length ? (
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {s.attachments.map((a) => (
                                      <img
                                        key={a.id}
                                        className="w-full h-28 object-cover rounded-lg border border-app-border bg-app-bg"
                                        src={`/api/v1/files/${a.fileId}`}
                                        alt={a.file.originalName}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-brand-secondary">No photos uploaded.</p>
                                )}
                              </div>
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs text-brand-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}

