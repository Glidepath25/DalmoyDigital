import Link from "next/link";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function DashboardPage(props: PageProps) {
  const userId = await requirePermission(PERMISSIONS.projectsRead);
  const canCreate = await hasPermission(userId, PERMISSIONS.projectsCreate);
  const sp = props.searchParams ?? {};
  const q = (toString(sp.q) ?? "").trim();
  const clientId = toString(sp.client) ?? "";
  const statusId = toString(sp.status) ?? "";
  const dueFrom = toDate(toString(sp.dueFrom));
  const dueTo = toDate(toString(sp.dueTo));

  const page = toInt(toString(sp.page), 1);
  const pageSize = Math.min(50, toInt(toString(sp.pageSize), 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } }
    ];
  }
  if (clientId) where.clientId = clientId;
  if (statusId) where.statusId = statusId;
  if (dueFrom || dueTo) {
    where.dueDate = {
      ...(dueFrom ? { gte: dueFrom } : {}),
      ...(dueTo ? { lte: dueTo } : {})
    };
  }

  const [clients, statuses, total, projects] = await Promise.all([
    db.client.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.projectStatus.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.project.count({ where }),
    db.project.findMany({
      where,
      include: { client: true, status: true },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: pageSize
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (clientId) baseParams.set("client", clientId);
  if (statusId) baseParams.set("status", statusId);
  if (dueFrom) baseParams.set("dueFrom", format(dueFrom, "yyyy-MM-dd"));
  if (dueTo) baseParams.set("dueTo", format(dueTo, "yyyy-MM-dd"));
  baseParams.set("pageSize", String(pageSize));

  const prevHref =
    page > 1 ? `/dashboard?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page - 1) })}` : null;
  const nextHref =
    page < totalPages
      ? `/dashboard?${new URLSearchParams({ ...Object.fromEntries(baseParams), page: String(page + 1) })}`
      : null;

  return (
    <AppShell title="Dashboard">
      {canCreate ? (
        <div className="flex items-center justify-end">
          <Link
            className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-slate-900 text-white hover:bg-slate-800"
            href="/projects/new"
          >
            New project
          </Link>
        </div>
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <form className="grid grid-cols-1 md:grid-cols-12 gap-3" method="get">
          <div className="md:col-span-4">
            <label className="text-xs font-medium text-slate-700">Search</label>
            <Input className="mt-1" defaultValue={q} name="q" placeholder="Project name or reference" />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-slate-700">Client</label>
            <Select className="mt-1" defaultValue={clientId} name="client">
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-slate-700">Status</label>
            <Select className="mt-1" defaultValue={statusId} name="status">
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-700">Due from</label>
            <Input
              className="mt-1"
              defaultValue={dueFrom ? format(dueFrom, "yyyy-MM-dd") : ""}
              name="dueFrom"
              type="date"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-700">Due to</label>
            <Input
              className="mt-1"
              defaultValue={dueTo ? format(dueTo, "yyyy-MM-dd") : ""}
              name="dueTo"
              type="date"
            />
          </div>
          <div className="md:col-span-12 flex items-center gap-2">
            <Button type="submit">Apply</Button>
            <Link className="text-sm text-slate-700 hover:underline" href="/dashboard">
              Clear
            </Link>
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {total} project{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            {prevHref ? (
              <Link
                className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
                href={prevHref}
                prefetch={false}
              >
                Previous
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-white text-slate-400 border border-slate-200 cursor-not-allowed">
                Previous
              </span>
            )}
            {nextHref ? (
              <Link
                className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
                href={nextHref}
                prefetch={false}
              >
                Next
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-white text-slate-400 border border-slate-200 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left font-medium px-4 py-2">Reference</th>
                <th className="text-left font-medium px-4 py-2">Project</th>
                <th className="text-left font-medium px-4 py-2">Client</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-left font-medium px-4 py-2">Due</th>
                <th className="text-left font-medium px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={6}>
                    No projects found.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-900">
                      <Link className="hover:underline" href={`/projects/${p.id}`}>
                        {p.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-700">{p.client.name}</td>
                    <td className="px-4 py-3 text-slate-700">{p.status.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.dueDate ? format(p.dueDate, "yyyy-MM-dd") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {format(p.updatedAt, "yyyy-MM-dd")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs text-slate-500">
          Page {page} of {totalPages}
        </div>
      </div>
    </AppShell>
  );
}
