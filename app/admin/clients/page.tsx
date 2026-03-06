import { format } from "date-fns";

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
      {saved ? <p className="text-sm text-green-700">Saved.</p> : null}
      {error ? <p className="text-sm text-red-700">Error: {error}</p> : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add client</h2>
        <form action={createClient} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-xs font-medium text-slate-700">Name</label>
            <Input className="mt-1" name="name" placeholder="Client name" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-slate-700">Sort order</label>
            <Input className="mt-1" defaultValue="0" name="sortOrder" type="number" />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input defaultChecked name="isActive" type="checkbox" value="true" />
              Active
            </label>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Active</th>
                <th className="text-left font-medium px-4 py-2">Sort</th>
                <th className="text-left font-medium px-4 py-2">Archived</th>
                <th className="text-right font-medium px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className={c.archivedAt ? "bg-slate-50" : ""}>
                  <td className="px-4 py-3">
                    <form action={updateClient.bind(null, c.id)} className="flex items-center gap-2">
                      <Input className="max-w-[320px]" defaultValue={c.name} name="name" />
                      <Input className="w-[100px]" defaultValue={String(c.sortOrder)} name="sortOrder" type="number" />
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input defaultChecked={c.isActive} name="isActive" type="checkbox" value="true" />
                        Active
                      </label>
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-700">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-slate-700">
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
                  <td className="px-4 py-8 text-slate-600" colSpan={5}>
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
