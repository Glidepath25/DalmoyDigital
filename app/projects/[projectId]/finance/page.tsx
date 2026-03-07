import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";

import { DataTableShell } from "@/components/app/data-table-shell";
import { EmptyState } from "@/components/app/empty-state";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requirePermission } from "@/lib/auth/guards";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

import { createFinanceLine, deleteFinanceLine, updateFinanceLine } from "./actions";

type PageProps = { params: { projectId: string }; searchParams?: Record<string, string | string[] | undefined> };

function toString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function decToNumber(v: Prisma.Decimal | null) {
  if (!v) return 0;
  return Number(v.toString());
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

function eurOrDash(v: Prisma.Decimal | null) {
  if (!v) return "—";
  return eur.format(decToNumber(v));
}

export default async function FinancePage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const project = await db.project.findUnique({ where: { id: props.params.projectId } });
  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const error = toString(props.searchParams?.error);

  const lines = await db.projectFinanceLine.findMany({
    where: { projectId: project.id },
    orderBy: [{ createdAt: "desc" }]
  });

  const totals = lines.reduce(
    (acc, l) => {
      acc.tendered += decToNumber(l.tenderedCost);
      acc.qty += decToNumber(l.qty);
      acc.actual += decToNumber(l.actualCost);
      acc.invoiced += decToNumber(l.invoicedCost);
      acc.margin += decToNumber(l.invoicedCost) - decToNumber(l.actualCost);
      return acc;
    },
    { tendered: 0, qty: 0, actual: 0, invoiced: 0, margin: 0 }
  );
  const marginPct = totals.invoiced > 0 ? (totals.margin / totals.invoiced) * 100 : null;

  return (
    <div className="space-y-4">
      <DataTableShell
        title="Finance"
        subtitle="Table-based cost tracker (Phase 1). Margin is invoiced minus actual."
        actions={<Badge tone="neutral">{lines.length} lines</Badge>}
      >
        {saved ? <p className="mb-2 text-sm font-semibold text-semantic-success">Saved.</p> : null}
        {error ? <p className="mb-2 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
          <StatCard label="Total tendered" value={eur.format(totals.tendered)} />
          <StatCard label="Total actual" value={eur.format(totals.actual)} />
          <StatCard label="Total invoiced" value={eur.format(totals.invoiced)} />
          <StatCard label="Total margin" value={eur.format(totals.margin)} hint={totals.margin < 0 ? "Negative margin" : undefined} />
          <StatCard label="Margin %" value={marginPct === null ? "—" : `${marginPct.toFixed(1)}%`} />
        </div>

        {canEdit ? (
          <div className="dd-card p-4 mb-3">
            <p className="text-sm font-semibold text-brand-primary">Add finance line</p>
            <form action={createFinanceLine.bind(null, project.id)} className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-brand-secondary">Item</label>
                <Input className="mt-1" name="item" placeholder="Item" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Supplier</label>
                <Input className="mt-1" name="supplier" placeholder="Supplier" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Tendered (€)</label>
                <Input className="mt-1" name="tenderedCost" type="number" step="0.01" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-brand-secondary">Qty</label>
                <Input className="mt-1" name="qty" type="number" step="0.01" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Actual (€)</label>
                <Input className="mt-1" name="actualCost" type="number" step="0.01" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-brand-secondary">Invoiced (€)</label>
                <Input className="mt-1" name="invoicedCost" type="number" step="0.01" />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button className="w-full" type="submit">
                  Add
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-xs text-brand-secondary">You don’t have permission to edit finance lines.</p>
        )}

        {lines.length === 0 ? (
          <EmptyState title="No finance lines yet" description="Add the first cost line to start tracking margin." />
        ) : (
          <div className="dd-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-app-bg">
                <tr className="text-left text-xs font-semibold text-brand-secondary">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2 text-right">Tendered Cost</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Actual Cost</th>
                  <th className="px-3 py-2 text-right">Invoiced Cost</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const margin = decToNumber(l.invoicedCost) - decToNumber(l.actualCost);
                  return (
                    <tr key={l.id} className="border-t border-app-border hover:bg-app-bg/50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-brand-primary">{l.item}</p>
                      </td>
                      <td className="px-3 py-2">{l.supplier ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{eurOrDash(l.tenderedCost)}</td>
                      <td className="px-3 py-2 text-right">{l.qty ? Number(l.qty.toString()).toFixed(2) : "—"}</td>
                      <td className="px-3 py-2 text-right">{eurOrDash(l.actualCost)}</td>
                      <td className="px-3 py-2 text-right">{eurOrDash(l.invoicedCost)}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge tone={margin >= 0 ? "success" : "danger"}>{eur.format(margin)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-2">
                            <details className="inline-block text-left">
                              <summary className="cursor-pointer text-sm font-semibold text-brand-accent hover:underline">
                                Edit
                              </summary>
                              <div className="mt-2 dd-card p-3 w-[640px]">
                                <form action={updateFinanceLine.bind(null, project.id, l.id)} className="grid grid-cols-2 gap-2">
                                  <div className="col-span-2">
                                    <label className="text-xs font-semibold text-brand-secondary">Item</label>
                                    <Input className="mt-1" defaultValue={l.item} name="item" />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-xs font-semibold text-brand-secondary">Supplier</label>
                                    <Input className="mt-1" defaultValue={l.supplier ?? ""} name="supplier" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-brand-secondary">Tendered (€)</label>
                                    <Input className="mt-1" defaultValue={l.tenderedCost?.toString() ?? ""} name="tenderedCost" type="number" step="0.01" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-brand-secondary">Qty</label>
                                    <Input className="mt-1" defaultValue={l.qty?.toString() ?? ""} name="qty" type="number" step="0.01" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-brand-secondary">Actual (€)</label>
                                    <Input className="mt-1" defaultValue={l.actualCost?.toString() ?? ""} name="actualCost" type="number" step="0.01" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-brand-secondary">Invoiced (€)</label>
                                    <Input className="mt-1" defaultValue={l.invoicedCost?.toString() ?? ""} name="invoicedCost" type="number" step="0.01" />
                                  </div>
                                  <div className="col-span-2 flex justify-end">
                                    <Button type="submit">Save</Button>
                                  </div>
                                </form>
                              </div>
                            </details>
                            <form action={deleteFinanceLine.bind(null, project.id, l.id)}>
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
                  );
                })}
              </tbody>
              <tfoot className="bg-app-bg border-t border-app-border">
                <tr className="text-sm font-semibold text-brand-primary">
                  <td className="px-3 py-2" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right">{eur.format(totals.tendered)}</td>
                  <td className="px-3 py-2 text-right">{totals.qty.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{eur.format(totals.actual)}</td>
                  <td className="px-3 py-2 text-right">{eur.format(totals.invoiced)}</td>
                  <td className="px-3 py-2 text-right">{eur.format(totals.margin)}</td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
