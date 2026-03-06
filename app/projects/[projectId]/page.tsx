import { format } from "date-fns";
import { notFound } from "next/navigation";

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

export default async function ProjectOverviewPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsRead);
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);

  const [project, clients, statuses, ragType, users] = await Promise.all([
    db.project.findUnique({
      where: { id: props.params.projectId },
      include: {
        client: true,
        status: true,
        ragOption: true,
        seniorManagerUser: true,
        siteManagerUser: true,
        contractManagerUser: true
      }
    }),
    db.client.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.projectStatus.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.lookupType.findUnique({
      where: { key: "project_rag" },
      include: {
        options: {
          where: { isActive: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
        }
      }
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }]
    })
  ]);

  if (!project) notFound();

  const saved = toString(props.searchParams?.saved) === "1";
  const created = toString(props.searchParams?.created) === "1";
  const exists = toString(props.searchParams?.exists) === "1";
  const error = toString(props.searchParams?.error);

  const progress = statusProgressPercent(project.status.name);
  const ragOptions = ragType?.options ?? [];

  return (
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
              <div>
                <label className="text-xs font-semibold text-brand-secondary">RAG</label>
                <Select className="mt-1" defaultValue={project.ragOptionId ?? ""} disabled={!canEdit} name="ragOptionId">
                  <option value="">—</option>
                  {ragOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Dalmoy Senior Manager</label>
                <Select
                  className="mt-1"
                  defaultValue={project.seniorManagerUserId ?? ""}
                  disabled={!canEdit}
                  name="seniorManagerUserId"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Site Manager</label>
                <Select
                  className="mt-1"
                  defaultValue={project.siteManagerUserId ?? ""}
                  disabled={!canEdit}
                  name="siteManagerUserId"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-brand-secondary">Contract Manager</label>
                <Select
                  className="mt-1"
                  defaultValue={project.contractManagerUserId ?? ""}
                  disabled={!canEdit}
                  name="contractManagerUserId"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 dd-card p-3">
                <p className="text-xs font-semibold text-brand-secondary">Progress</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 w-40 rounded-full bg-app-border/70 overflow-hidden">
                    <div className="h-full bg-brand-accent" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-brand-secondary">{progress}%</span>
                </div>
                <p className="mt-2 text-xs text-brand-secondary">
                  Calculated from status (placeholder until programme is wired).
                </p>
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
              <dt className="text-brand-secondary">RAG</dt>
              <dd className="text-brand-primary font-semibold text-right">{project.ragOption?.label ?? "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-brand-secondary">Due date</dt>
              <dd className="text-brand-primary font-semibold text-right">
                {project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-brand-secondary">Created</dt>
              <dd className="text-brand-primary font-semibold text-right">{format(project.createdAt, "yyyy-MM-dd")}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-brand-secondary">Last updated</dt>
              <dd className="text-brand-primary font-semibold text-right">{format(project.updatedAt, "yyyy-MM-dd")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard subtitle="Phase 2 wiring (visual placeholders)." title="Project health snapshot">
          <div className="grid grid-cols-1 gap-3">
            <div className="dd-card p-3">
              <p className="text-xs font-semibold text-brand-secondary">Health indicator</p>
              <p className="mt-2 text-sm font-semibold text-brand-primary">—</p>
              <p className="mt-1 text-xs text-brand-secondary">Placeholder</p>
            </div>
            <div className="dd-card p-3">
              <p className="text-xs font-semibold text-brand-secondary">Urgency</p>
              <p className="mt-2 text-sm font-semibold text-brand-primary">—</p>
              <p className="mt-1 text-xs text-brand-secondary">Placeholder</p>
            </div>
            <div className="dd-card p-3">
              <p className="text-xs font-semibold text-brand-secondary">Budget</p>
              <p className="mt-2 text-sm font-semibold text-brand-primary">—</p>
              <p className="mt-1 text-xs text-brand-secondary">Placeholder (see Finance tab)</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

