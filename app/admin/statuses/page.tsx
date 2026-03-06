import { format } from "date-fns";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import { archiveStatus, createStatus, restoreStatus, updateStatus } from "./actions";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminStatusesPage(props: PageProps) {
  await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.lookupsManage);

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const statuses = await db.projectStatus.findMany({
    orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell title="Admin • Project Statuses">
      <AdminNav active="statuses" />
      {saved ? <p className="mt-4 text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-brand-primary">Add status</h2>
        <form action={createStatus} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-brand-secondary">Name</label>
            <Input className="mt-1" name="name" placeholder="Status name" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-brand-secondary">Sort order</label>
            <Input className="mt-1" defaultValue="0" name="sortOrder" type="number" />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
              <input defaultChecked name="isActive" type="checkbox" value="true" />
              Active
            </label>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 dd-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-app-bg text-brand-secondary">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Active</th>
                <th className="text-left font-semibold px-4 py-3">Sort</th>
                <th className="text-left font-semibold px-4 py-3">Archived</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-white">
              {statuses.map((s) => (
                <tr key={s.id} className={s.archivedAt ? "bg-app-bg/60" : ""}>
                  <td className="px-4 py-3">
                    <form action={updateStatus.bind(null, s.id)} className="flex items-center gap-2">
                      <Input className="max-w-[320px]" defaultValue={s.name} name="name" />
                      <Input className="w-[100px]" defaultValue={String(s.sortOrder)} name="sortOrder" type="number" />
                      <label className="flex items-center gap-2 text-xs font-semibold text-brand-secondary">
                        <input defaultChecked={s.isActive} name="isActive" type="checkbox" value="true" />
                        Active
                      </label>
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-brand-secondary">{s.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-brand-secondary">{s.sortOrder}</td>
                  <td className="px-4 py-3 text-brand-secondary">
                    {s.archivedAt ? format(s.archivedAt, "yyyy-MM-dd") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.archivedAt ? (
                      <form action={restoreStatus.bind(null, s.id)}>
                        <Button type="submit" variant="secondary">
                          Restore
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveStatus.bind(null, s.id)}>
                        <Button type="submit" variant="secondary">
                          Archive
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {statuses.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-brand-secondary" colSpan={5}>
                    No statuses yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
