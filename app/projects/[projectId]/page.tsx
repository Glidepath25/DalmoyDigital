import { format } from "date-fns";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
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
  const error = toString(props.searchParams?.error);

  return (
    <AppShell title={`Project: ${project.reference}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-600">Client</dt>
              <dd className="text-slate-900 text-right">{project.client.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-600">Status</dt>
              <dd className="text-slate-900 text-right">{project.status.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-600">Due date</dt>
              <dd className="text-slate-900 text-right">
                {project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-600">Created</dt>
              <dd className="text-slate-900 text-right">{format(project.createdAt, "yyyy-MM-dd")}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-600">Last updated</dt>
              <dd className="text-slate-900 text-right">{format(project.updatedAt, "yyyy-MM-dd")}</dd>
            </div>
          </dl>
        </section>

        <section className="lg:col-span-8 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Project details</h2>
              <p className="text-xs text-slate-600 mt-1">
                {canEdit ? "Edit and save changes." : "Read-only access."}
              </p>
            </div>
          </div>

          {saved ? <p className="mt-3 text-sm text-green-700">Saved.</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">Could not save ({error}).</p> : null}

          <form action={updateProject.bind(null, project.id)} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Project reference / ID</label>
                <Input className="mt-1" defaultValue={project.reference} disabled={!canEdit} name="reference" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Project name</label>
                <Input className="mt-1" defaultValue={project.name} disabled={!canEdit} name="name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Client</label>
                <Select className="mt-1" defaultValue={project.clientId} disabled={!canEdit} name="clientId">
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Status</label>
                <Select className="mt-1" defaultValue={project.statusId} disabled={!canEdit} name="statusId">
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Due date</label>
                <Input
                  className="mt-1"
                  defaultValue={project.dueDate ? format(project.dueDate, "yyyy-MM-dd") : ""}
                  disabled={!canEdit}
                  name="dueDate"
                  type="date"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Notes</label>
              <Textarea
                className="mt-1 min-h-[140px]"
                defaultValue={project.notes ?? ""}
                disabled={!canEdit}
                name="notes"
                placeholder="Add any notes for this project..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button disabled={!canEdit} type="submit">
                Save
              </Button>
              {!canEdit ? <span className="text-xs text-slate-500">You don’t have edit permission.</span> : null}
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
