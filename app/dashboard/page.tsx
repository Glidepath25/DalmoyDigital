import Link from "next/link";
import { Prisma } from "@prisma/client";
import { endOfWeek, format, startOfWeek } from "date-fns";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { FilterPanel } from "@/components/app/filter-panel";
import { SectionCard } from "@/components/app/section-card";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
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

function statusProgressPercent(statusName: string) {
  const name = statusName.trim().toLowerCase();
  if (name === "costing") return 15;
  if (name === "in progress") return 55;
  if (name === "snagging") return 85;
  if (name === "complete" || name === "completed") return 100;
  if (name === "on hold") return 40;
  if (name === "cancelled" || name === "canceled") return 0;
  return 35;
}

function dueTone(dueDate: Date | null) {
  if (!dueDate) return "neutral" as const;
  const now = new Date();
  const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "danger" as const;
  if (days <= 3) return "warning" as const;
  return "neutral" as const;
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

  const statusIdInProgress = statuses.find((s) => s.name.trim().toLowerCase() === "in progress")?.id ?? null;
  const statusIdComplete = statuses.find((s) => s.name.trim().toLowerCase() === "complete")?.id ?? null;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [totalAll, inProgressAll, dueThisWeekAll, completedAll] = await Promise.all([
    db.project.count(),
    statusIdInProgress ? db.project.count({ where: { statusId: statusIdInProgress } }) : Promise.resolve(0),
    db.project.count({ where: { dueDate: { gte: weekStart, lte: weekEnd } } }),
    statusIdComplete ? db.project.count({ where: { statusId: statusIdComplete } }) : Promise.resolve(0)
  ]);

  const now = new Date();
  const [
    myOpenActionsCount,
    myOpenSnagsCount,
    myOverdueActionsCount,
    myOverdueSnagsCount,
    myActions,
    mySnags
  ] = await Promise.all([
    db.projectActionItem.count({ where: { ownerUserId: userId, actualClosureDate: null } }),
    db.projectSnag.count({ where: { responsibleUserId: userId, dateClosed: null } }),
    db.projectActionItem.count({
      where: { ownerUserId: userId, actualClosureDate: null, requiredClosureDate: { lt: now } }
    }),
    db.projectSnag.count({
      where: { responsibleUserId: userId, dateClosed: null, targetClosureDate: { lt: now } }
    }),
    db.projectActionItem.findMany({
      where: { ownerUserId: userId, actualClosureDate: null },
      include: { project: { select: { id: true, name: true, reference: true } }, statusOption: true, priorityOption: true },
      orderBy: [{ requiredClosureDate: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    db.projectSnag.findMany({
      where: { responsibleUserId: userId, dateClosed: null },
      include: { project: { select: { id: true, name: true, reference: true } }, statusOption: true, priorityOption: true },
      orderBy: [{ targetClosureDate: "asc" }, { dateRaised: "desc" }],
      take: 6
    })
  ]);
  const myOverdueTotal = myOverdueActionsCount + myOverdueSnagsCount;

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

  const primaryAction = canCreate ? (
    <Link
      className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-4 py-2 bg-brand-primary text-white hover:bg-brand-secondary border border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:ring-offset-2 focus:ring-offset-app-bg transition-colors"
      href="/projects/new"
    >
      New project
    </Link>
  ) : null;

  return (
    <AppShell
      actions={primaryAction}
      subtitle="Track fitout projects from costing through to handover."
      title="Projects"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Total projects" value={totalAll} />
        <StatCard label="In progress" value={inProgressAll} />
        <StatCard label="Due this week" hint={`${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d")}`} value={dueThisWeekAll} />
        <StatCard label="Completed" value={completedAll} />
      </div>

      <div className="mt-4">
        <SectionCard
          title="My Work"
          subtitle="Assigned actions and snags that need your attention."
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{myOpenActionsCount + myOpenSnagsCount} open</Badge>
              <Badge tone={myOverdueTotal ? "danger" : "neutral"}>{myOverdueTotal} overdue</Badge>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="My open actions" value={myOpenActionsCount} />
            <StatCard label="My open snags" value={myOpenSnagsCount} />
            <StatCard label="My overdue items" value={myOverdueTotal} />
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="dd-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-primary">Critical action items</p>
                <Badge tone="neutral">{myActions.length}</Badge>
              </div>
              {myActions.length === 0 ? (
                <p className="mt-3 text-sm text-brand-secondary">No open action items assigned to you.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {myActions.map((a) => {
                    const overdue = a.requiredClosureDate ? a.requiredClosureDate < now : false;
                    return (
                      <Link
                        key={a.id}
                        className="block rounded-lg border border-app-border bg-white p-3 hover:bg-app-bg/50 transition-colors"
                        href={`/projects/${a.projectId}/actions`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-brand-primary">{a.title}</p>
                            <p className="mt-1 text-xs text-brand-secondary">
                              {a.project.reference} • {a.project.name}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone="neutral">{a.statusOption?.label ?? "Status —"}</Badge>
                              <Badge tone="neutral">{a.priorityOption?.label ?? "Priority —"}</Badge>
                              {a.requiredClosureDate ? (
                                <Badge tone={overdue ? "danger" : "neutral"}>
                                  Due {format(a.requiredClosureDate, "MMM d")}
                                </Badge>
                              ) : (
                                <Badge tone="neutral">No due date</Badge>
                              )}
                            </div>
                          </div>
                          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dd-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-primary">Snags</p>
                <Badge tone="neutral">{mySnags.length}</Badge>
              </div>
              {mySnags.length === 0 ? (
                <p className="mt-3 text-sm text-brand-secondary">No open snags assigned to you.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {mySnags.map((s) => {
                    const overdue = s.targetClosureDate ? s.targetClosureDate < now : false;
                    return (
                      <Link
                        key={s.id}
                        className="block rounded-lg border border-app-border bg-white p-3 hover:bg-app-bg/50 transition-colors"
                        href={`/projects/${s.projectId}/snags`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-brand-primary">{s.title}</p>
                            <p className="mt-1 text-xs text-brand-secondary">
                              {s.project.reference} • {s.project.name}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge tone="neutral">{s.statusOption?.label ?? "Status —"}</Badge>
                              <Badge tone="neutral">{s.priorityOption?.label ?? "Priority —"}</Badge>
                              {s.targetClosureDate ? (
                                <Badge tone={overdue ? "danger" : "neutral"}>
                                  Target {format(s.targetClosureDate, "MMM d")}
                                </Badge>
                              ) : (
                                <Badge tone="neutral">No target</Badge>
                              )}
                            </div>
                          </div>
                          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <FilterPanel title="Find projects">
          <form className="grid grid-cols-1 md:grid-cols-12 gap-3" method="get">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-brand-secondary">Search</label>
              <Input className="mt-1" defaultValue={q} name="q" placeholder="Project name or reference" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-brand-secondary">Client</label>
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
              <label className="text-xs font-semibold text-brand-secondary">Status</label>
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
              <label className="text-xs font-semibold text-brand-secondary">Due from</label>
              <Input
                className="mt-1"
                defaultValue={dueFrom ? format(dueFrom, "yyyy-MM-dd") : ""}
                name="dueFrom"
                type="date"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-brand-secondary">Due to</label>
              <Input
                className="mt-1"
                defaultValue={dueTo ? format(dueTo, "yyyy-MM-dd") : ""}
                name="dueTo"
                type="date"
              />
            </div>
            <div className="md:col-span-12 flex items-center gap-2">
              <Button type="submit">Apply filters</Button>
              <Link className="text-sm font-semibold text-brand-accent hover:underline" href="/dashboard">
                Clear
              </Link>
              <span className="ml-auto text-xs text-brand-secondary">
                Showing {projects.length} of {total} match{total === 1 ? "" : "es"}
              </span>
            </div>
          </form>
        </FilterPanel>
      </div>

      <div className="mt-4 dd-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-app-border bg-white">
          <p className="text-sm text-brand-secondary">
            {total} project{total === 1 ? "" : "s"} (page {page} of {totalPages})
          </p>
          <div className="flex items-center gap-2">
            {prevHref ? (
              <Link
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-3 py-1.5 bg-white text-brand-primary border border-app-border hover:bg-app-bg"
                href={prevHref}
                prefetch={false}
              >
                Previous
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-3 py-1.5 bg-white text-brand-secondary/50 border border-app-border cursor-not-allowed">
                Previous
              </span>
            )}
            {nextHref ? (
              <Link
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-3 py-1.5 bg-white text-brand-primary border border-app-border hover:bg-app-bg"
                href={nextHref}
                prefetch={false}
              >
                Next
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-3 py-1.5 bg-white text-brand-secondary/50 border border-app-border cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="p-4">
            <EmptyState
              actionHref="/dashboard"
              actionLabel="Clear filters"
              description="Try adjusting filters or clearing search terms."
              title="No projects match your filters"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-app-bg text-brand-secondary">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Project</th>
                  <th className="text-left font-semibold px-4 py-3">Client</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Progress</th>
                  <th className="text-left font-semibold px-4 py-3">Due</th>
                  <th className="text-left font-semibold px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border bg-white">
                {projects.map((p) => {
                  const href = `/projects/${p.id}`;
                  const percent = statusProgressPercent(p.status.name);
                  const tone = dueTone(p.dueDate);
                  return (
                    <tr className="group hover:bg-app-bg/60" key={p.id}>
                      <td className="px-4 py-3">
                        <Link className="block" href={href}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-brand-primary group-hover:text-brand-primary">
                                {p.name}
                              </p>
                              <p className="text-xs text-brand-secondary mt-0.5">{p.reference}</p>
                            </div>
                            <span className="text-xs font-semibold text-brand-accent">Open</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-brand-secondary">
                        <Link className="block" href={href}>
                          {p.client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="block" href={href}>
                          <StatusBadge name={p.status.name} />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="block" href={href}>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 rounded-full bg-app-border/70 overflow-hidden">
                              <div
                                className="h-full bg-brand-accent"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-brand-secondary">{percent}%</span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link className="block" href={href}>
                          {p.dueDate ? (
                            <Badge tone={tone}>
                              Due {format(p.dueDate, "MMM d")}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">No due date</Badge>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-brand-secondary whitespace-nowrap">
                        <Link className="block" href={href}>
                          {format(p.updatedAt, "yyyy-MM-dd")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
