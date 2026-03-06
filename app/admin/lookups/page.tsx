import Link from "next/link";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import { archiveLookupType, createLookupType, restoreLookupType } from "./actions";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLookupsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.lookupsManage);

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const lookupTypes = await db.lookupType.findMany({
    include: { _count: { select: { options: true } } },
    orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <AppShell title="Admin • Lookup Values">
      <AdminNav active="lookups" />
      {saved ? <p className="mt-4 text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add lookup type</h2>
        <p className="text-xs text-slate-600 mt-1">These power admin-manageable dropdowns across the platform.</p>
        <form action={createLookupType} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-slate-700">Key</label>
            <Input className="mt-1" name="key" placeholder="e.g. snag_status" />
          </div>
          <div className="md:col-span-4">
            <label className="text-xs font-medium text-slate-700">Name</label>
            <Input className="mt-1" name="name" placeholder="Human-friendly name" />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea className="mt-1" name="description" placeholder="Optional" />
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
                <th className="text-left font-medium px-4 py-2">Key</th>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Options</th>
                <th className="text-right font-medium px-4 py-2">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lookupTypes.map((lt) => (
                <tr className={lt.archivedAt ? "bg-slate-50" : ""} key={lt.id}>
                  <td className="px-4 py-3 text-slate-900">{lt.key}</td>
                  <td className="px-4 py-3 text-slate-900">{lt.name}</td>
                  <td className="px-4 py-3 text-slate-700">{lt._count.options}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link className="text-sm text-blue-700 hover:underline" href={`/admin/lookups/${lt.id}`}>
                      Options
                    </Link>
                    {lt.archivedAt ? (
                      <form action={restoreLookupType.bind(null, lt.id)} className="inline">
                        <Button type="submit" variant="secondary">
                          Restore
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveLookupType.bind(null, lt.id)} className="inline">
                        <Button type="submit" variant="secondary">
                          Archive
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {lookupTypes.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={4}>
                    No lookup types yet.
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
