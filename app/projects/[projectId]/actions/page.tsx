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

import { createActionItem, deleteActionItem, updateActionItem } from "./actions";

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
  if (value.includes("closed") || value.includes("complete") || value.includes("done")) return "success" as const;
  if (value.includes("blocked")) return "danger" as const;
  if (value.includes("in_progress") || value.includes("progress")) return "warning" as const;
  if (value.includes("critical") || value.includes("high")) return "danger" as const;
  return "neutral" as const;
}

export default async function CriticalActionsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const [items, statusType, priorityType, users] = await Promise.all([
    db.projectActionItem.findMany({
      where: { projectId: project.id },
      include: { ownerUser: true, statusOption: true, priorityOption: true },
      orderBy: [{ requiredClosureDate: "asc" }, { createdAt: "desc" }]
    }),
    db.lookupType.findUnique({
      where: { key: "action_status" },
      include: {
        options: {
          where: { isActive: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
        }
      }
    }),
    db.lookupType.findUnique({
      where: { key: "action_priority" },
      include: {
        options: {
          where: { isActive: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
        }
      }
    }),
    db.user.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }, { email: "asc" }] })
  ]);

  const statusOptions = statusType?.options ?? [];
  const priorityOptions = priorityType?.options ?? [];

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Critical Action Items"
        subtitle="Track priority actions with owners and closure dates. Built for future reminders/notifications."
        actions={<Badge tone="neutral">{items.length} items</Badge>}
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        {canEdit ? (
          <div className="dd-card p-4 mb-3">
            <p className="text-sm font-semibold text-brand-primary">Add action item</p>
            <form action={createActionItem.bind(null, project.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-brand-secondary">Action / item</label>
                <Input className="mt-1" name="title" placeholder="Action item..." />
              </div>
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
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
                <label className="text-xs font-semibold text-brand-secondary">Dalmoy owner</label>
                <Select className="mt-1" name="ownerUserId">
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Required closure</label>
                <Input className="mt-1" name="requiredClosureDate" type="date" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Actual closure</label>
                <Input className="mt-1" name="actualClosureDate" type="date" />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button className="w-full" type="submit">
                  Add
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-xs text-brand-secondary">You don’t have permission to add or edit action items.</p>
        )}

        {items.length === 0 ? (
          <EmptyState title="No action items yet" description="Add your first critical action to start tracking closure." />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">Action / Item</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Required closure</th>
                  <th className="px-3 py-2">Actual closure</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-app-border hover:bg-app-bg/50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-brand-primary">{it.title}</p>
                    </td>
                    <td className="px-3 py-2">
                      {it.statusOption ? (
                        <Badge tone={badgeToneFromValue(it.statusOption.value)}>{it.statusOption.label}</Badge>
                      ) : (
                        <Badge tone="neutral">—</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">{it.ownerUser ? it.ownerUser.name ?? it.ownerUser.email : "—"}</td>
                    <td className="px-3 py-2">
                      {it.priorityOption ? (
                        <Badge tone={badgeToneFromValue(it.priorityOption.value)}>{it.priorityOption.label}</Badge>
                      ) : (
                        <Badge tone="neutral">—</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">{it.requiredClosureDate ? format(it.requiredClosureDate, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2">{it.actualClosureDate ? format(it.actualClosureDate, "yyyy-MM-dd") : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-2">
                          <details className="inline-block text-left">
                            <summary className="cursor-pointer text-sm font-semibold text-brand-accent hover:underline">
                              Edit
                            </summary>
                            <div className="mt-2 dd-card p-3 w-[560px]">
                              <form action={updateActionItem.bind(null, project.id, it.id)} className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-brand-secondary">Action / item</label>
                                  <Input className="mt-1" defaultValue={it.title} name="title" />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Status</label>
                                  <Select className="mt-1" defaultValue={it.statusOptionId ?? ""} name="statusOptionId">
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
                                  <Select className="mt-1" defaultValue={it.priorityOptionId ?? ""} name="priorityOptionId">
                                    <option value="">—</option>
                                    {priorityOptions.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Owner</label>
                                  <Select className="mt-1" defaultValue={it.ownerUserId ?? ""} name="ownerUserId">
                                    <option value="">—</option>
                                    {users.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.name ? `${u.name} (${u.email})` : u.email}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Required closure</label>
                                  <Input
                                    className="mt-1"
                                    defaultValue={toDateInputValue(it.requiredClosureDate)}
                                    name="requiredClosureDate"
                                    type="date"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-brand-secondary">Actual closure</label>
                                  <Input
                                    className="mt-1"
                                    defaultValue={toDateInputValue(it.actualClosureDate)}
                                    name="actualClosureDate"
                                    type="date"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                  <Button type="submit">Save</Button>
                                </div>
                              </form>
                            </div>
                          </details>

                          <form action={deleteActionItem.bind(null, project.id, it.id)}>
                            <Button variant="danger" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-brand-secondary">—</span>
                      )}
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
