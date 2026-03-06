import { format } from "date-fns";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import { archiveClient, createClient, restoreClient, updateClient } from "./actions";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminClientsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.lookupsManage);

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const clients = await db.client.findMany({
    orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell title="Admin • Clients">
      <AdminNav active="clients" />
      {saved ? <p className="mt-4 text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-brand-primary">Add client</h2>
        <form action={createClient} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-brand-secondary">Name</label>
            <Input className="mt-1" name="name" placeholder="Client name" />
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
              {clients.map((c) => (
                <tr key={c.id} className={c.archivedAt ? "bg-app-bg/60" : ""}>
                  <td className="px-4 py-3">
                    <form action={updateClient.bind(null, c.id)} className="flex items-center gap-2">
                      <Input className="max-w-[320px]" defaultValue={c.name} name="name" />
                      <Input className="w-[100px]" defaultValue={String(c.sortOrder)} name="sortOrder" type="number" />
                      <label className="flex items-center gap-2 text-xs font-semibold text-brand-secondary">
                        <input defaultChecked={c.isActive} name="isActive" type="checkbox" value="true" />
                        Active
                      </label>
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-brand-secondary">{c.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-brand-secondary">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-brand-secondary">
                    {c.archivedAt ? format(c.archivedAt, "yyyy-MM-dd") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.archivedAt ? (
                      <form action={restoreClient.bind(null, c.id)}>
                        <Button type="submit" variant="secondary">
                          Restore
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveClient.bind(null, c.id)}>
                        <Button type="submit" variant="secondary">
                          Archive
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-brand-secondary" colSpan={5}>
                    No clients yet.
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
