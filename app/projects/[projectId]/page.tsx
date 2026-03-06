import { format } from "date-fns";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { PlaceholderModuleCard } from "@/components/app/placeholder-module-card";
import { SectionCard } from "@/components/app/section-card";
import { StatusBadge } from "@/components/app/status-badge";
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

import { updateProject } from "./actions";

type PageProps = {
  params: { projectId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

export default async function ProjectDetailPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const [project, clients, statuses] = await Promise.all([
    db.project.findUnique({
      where: { id: props.params.projectId },
      include: { client: true, status: true }
    }),
    db.client.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.projectStatus.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const created = toString(props.searchParams?.created) === "1";
  const exists = toString(props.searchParams?.exists) === "1";
  const error = toString(props.searchParams?.error);

  const progress = statusProgressPercent(project.status.name);
  const headerSubtitle = `${project.reference} • ${project.client.name}`;

  return (
    <AppShell subtitle={headerSubtitle} title={project.name}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <SectionCard
            subtitle={canEdit ? "Edit key details and save changes." : "Read-only access."}
            title="Project summary"
            actions={
              <div className="flex items-center gap-2">
                <StatusBadge name={project.status.name} />
                {project.dueDate ? <Badge tone="neutral">Due {format(project.dueDate, "MMM d")}</Badge> : null}
              </div>
            }
          >
            {created ? <p className="text-sm text-semantic-success font-semibold">Project created.</p> : null}
            {exists ? (
              <p className="text-sm text-brand-secondary font-semibold">
                A project with that reference already existed — opened it instead.
              </p>
            ) : null}
            {saved ? <p className="text-sm text-semantic-success font-semibold">Saved.</p> : null}
            {error ? <p className="text-sm text-semantic-danger font-semibold">Could not save ({error}).</p> : null}

            <form action={updateProject.bind(null, project.id)} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-brand-secondary">Project reference / ID</label>
                  <Input className="mt-1" defaultValue={project.reference} disabled={!canEdit} name="reference" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-secondary">Project name</label>
                  <Input className="mt-1" defaultValue={project.name} disabled={!canEdit} name="name" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-brand-secondary">Client</label>
                  <Select className="mt-1" defaultValue={project.clientId} disabled={!canEdit} name="clientId">
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-secondary">Status</label>
                  <Select className="mt-1" defaultValue={project.statusId} disabled={!canEdit} name="statusId">
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-secondary">Due date</label>
                  <Input
                    className="mt-1"
                    defaultValue={project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : ""}
                    disabled={!canEdit}
                    name="dueDate"
                    type="date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="dd-card p-3">
                  <p className="text-xs font-semibold text-brand-secondary">Progress</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 w-40 rounded-full bg-app-border/70 overflow-hidden">
                      <div className="h-full bg-brand-accent" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-brand-secondary">{progress}%</span>
                  </div>
                </div>
                <div className="dd-card p-3">
                  <p className="text-xs font-semibold text-brand-secondary">Project health</p>
                  <p className="mt-2 text-sm font-semibold text-brand-primary">—</p>
                  <p className="mt-1 text-xs text-brand-secondary">Placeholder (Phase 2)</p>
                </div>
                <div className="dd-card p-3">
                  <p className="text-xs font-semibold text-brand-secondary">Snags</p>
                  <p className="mt-2 text-sm font-semibold text-brand-primary">—</p>
                  <p className="mt-1 text-xs text-brand-secondary">Placeholder (Phase 2)</p>
                </div>
              </div>

              <SectionCard subtitle="Site notes, handover notes, and internal comments." title="Notes">
                <label className="text-xs font-semibold text-brand-secondary">Notes</label>
                <Textarea
                  className="mt-1 min-h-[160px]"
                  defaultValue={project.notes ?? ""}
                  disabled={!canEdit}
                  name="notes"
                  placeholder="Add any notes for this project..."
                />
              </SectionCard>

              <div className="flex items-center gap-2">
                <Button disabled={!canEdit} type="submit">
                  Save changes
                </Button>
                {!canEdit ? <span className="text-xs text-brand-secondary">You don’t have edit permission.</span> : null}
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <SectionCard title="Key metadata">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Client</dt>
                <dd className="text-brand-primary font-semibold text-right">{project.client.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Status</dt>
                <dd className="text-right">
                  <StatusBadge name={project.status.name} />
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Due date</dt>
                <dd className="text-brand-primary font-semibold text-right">
                  {project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Created</dt>
                <dd className="text-brand-primary font-semibold text-right">
                  {format(project.createdAt, "yyyy-MM-dd")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-brand-secondary">Last updated</dt>
                <dd className="text-brand-primary font-semibold text-right">
                  {format(project.updatedAt, "yyyy-MM-dd")}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            subtitle="These modules are planned for Phase 2."
            title="Project workspace modules"
          >
            <div className="grid grid-cols-1 gap-3">
              <PlaceholderModuleCard description="Programme overview, milestones, and critical path." title="Programme timeline" />
              <PlaceholderModuleCard description="Budget, committed costs, variations, and forecasts." title="Budget / cost tracker" />
              <PlaceholderModuleCard description="Site photo capture and tagging." title="Site photos" />
              <PlaceholderModuleCard description="Defects log with severity and assignment." title="Snagging / defects" />
              <PlaceholderModuleCard description="Actions, owners, due dates, and approvals." title="Tasks / actions" />
              <PlaceholderModuleCard description="Drawings, RFIs, and handover packs." title="Documents" />
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
