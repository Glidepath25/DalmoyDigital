import Link from "next/link";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

import {
  archiveLookupOption,
  createLookupOption,
  restoreLookupOption,
  updateLookupOption
} from "./actions";

type PageProps = { params: { lookupTypeId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LookupTypeOptionsPage(props: PageProps) {
  await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.lookupsManage);

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const lookupType = await db.lookupType.findUnique({
    where: { id: props.params.lookupTypeId },
    include: { options: { orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }, { label: "asc" }] } }
  });

  if (!lookupType) {
    return (
      <AppShell title="Admin | Lookup Options">
        <AdminNav active="lookups" />
        <p className="text-sm text-brand-secondary">Lookup type not found.</p>
        <Link className="dd-link" href="/admin/lookups">
          Back
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Admin | Lookup Options | ${lookupType.name}`}>
      <AdminNav active="lookups" />
      <div className="flex items-center justify-between gap-3">
        <Link className="dd-link" href="/admin/lookups">
          <- Back to lookup types
        </Link>
        <p className="text-xs text-brand-secondary">Key: {lookupType.key}</p>
      </div>

      {saved ? <p className="mt-3 text-sm font-semibold text-semantic-success">Saved.</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

      <Card className="p-4 mt-4">
        <h2 className="text-sm font-semibold text-brand-primary">Add option</h2>
        <form action={createLookupOption.bind(null, lookupType.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs font-medium text-brand-secondary">Label</label>
            <Input className="mt-1" name="label" placeholder="Display text" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-brand-secondary">Value</label>
            <Input className="mt-1" name="value" placeholder="machine_value" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-brand-secondary">Sort order</label>
            <Input className="mt-1" defaultValue="0" name="sortOrder" type="number" />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-brand-secondary">
              <input defaultChecked name="isActive" type="checkbox" value="true" />
              Active
            </label>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 dd-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dd-table min-w-full">
            <thead>
              <tr>
                <th className="text-left font-medium px-4 py-2">Label</th>
                <th className="text-left font-medium px-4 py-2">Value</th>
                <th className="text-left font-medium px-4 py-2">Active</th>
                <th className="text-left font-medium px-4 py-2">Sort</th>
                <th className="text-right font-medium px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {lookupType.options.map((o) => (
                <tr className={o.archivedAt ? "bg-app-muted" : ""} key={o.id}>
                  <td className="px-4 py-3">
                    <form
                      action={updateLookupOption.bind(null, lookupType.id, o.id)}
                      className="flex items-center gap-2"
                    >
                      <Input className="max-w-[280px]" defaultValue={o.label} name="label" />
                      <Input className="max-w-[220px]" defaultValue={o.value} name="value" />
                      <Input className="w-[100px]" defaultValue={String(o.sortOrder)} name="sortOrder" type="number" />
                      <label className="flex items-center gap-2 text-xs text-brand-secondary">
                        <input defaultChecked={o.isActive} name="isActive" type="checkbox" value="true" />
                        Active
                      </label>
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-brand-secondary">{o.value}</td>
                  <td className="px-4 py-3 text-brand-secondary">{o.isActive ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-brand-secondary">{o.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    {o.archivedAt ? (
                      <form action={restoreLookupOption.bind(null, lookupType.id, o.id)}>
                        <Button type="submit" variant="secondary">
                          Restore
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveLookupOption.bind(null, lookupType.id, o.id)}>
                        <Button type="submit" variant="secondary">
                          Archive
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {lookupType.options.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-brand-secondary" colSpan={5}>
                    No options yet.
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


