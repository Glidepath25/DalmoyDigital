import Link from "next/link";
import { format } from "date-fns";

import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/actions/projects";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function toString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewProjectPage(props: PageProps) {
  await requirePermission(PERMISSIONS.projectsCreate);

  const [clients, statuses] = await Promise.all([
    db.client.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    db.projectStatus.findMany({
      where: { isActive: true, archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  const error = toString(props.searchParams?.error);

  return (
    <AppShell subtitle="Create a new fitout project workspace." title="New project">
      <div className="flex items-center justify-between gap-3">
        <Link className="text-sm font-semibold text-brand-accent hover:underline" href="/dashboard">
          ← Back to dashboard
        </Link>
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-semantic-danger">Error: {error}</p> : null}
      <Card className="p-4 mt-4">
        <form action={createProject.bind(null, "app")} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-brand-secondary">Project reference / ID</label>
              <Input className="mt-1" name="reference" placeholder="e.g. DD-0005" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-secondary">Project name</label>
              <Input className="mt-1" name="name" placeholder="Project name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-brand-secondary">Client</label>
              <Select className="mt-1" name="clientId">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-secondary">Status</label>
              <Select className="mt-1" name="statusId">
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-secondary">Due date</label>
              <Input className="mt-1" defaultValue={format(new Date(), "yyyy-MM-dd")} name="dueDate" type="date" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-brand-secondary">Notes</label>
            <Textarea className="mt-1 min-h-[140px]" name="notes" placeholder="Optional notes..." />
          </div>

          <Button type="submit">Create project</Button>
        </form>
      </Card>
    </AppShell>
  );
}
