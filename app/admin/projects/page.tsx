import Link from "next/link";

import { AdminNav } from "@/components/app/admin-nav";
import { AppShell } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

export default async function AdminProjectsPage() {
  const userId = await requirePermission(PERMISSIONS.adminAccess);
  await requirePermission(PERMISSIONS.projectsRead);
  const canCreate = await hasPermission(userId, PERMISSIONS.projectsCreate);

  const projects = await db.project.findMany({
    include: { client: true, status: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 100
  });

  return (
    <AppShell title="Admin • Projects">
      <AdminNav active="projects" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-brand-secondary">Showing the most recently updated projects.</p>
        {canCreate ? (
          <Link
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold px-4 py-2 bg-brand-primary text-white hover:bg-brand-secondary border border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:ring-offset-2 focus:ring-offset-app-bg transition-colors"
            href="/admin/projects/new"
          >
            New project
          </Link>
        ) : null}
      </div>

      <div className="mt-4 dd-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-app-bg text-brand-secondary">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Reference</th>
                <th className="text-left font-semibold px-4 py-3">Project</th>
                <th className="text-left font-semibold px-4 py-3">Client</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-white">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-app-bg/60">
                  <td className="px-4 py-3 text-brand-primary font-semibold">{p.reference}</td>
                  <td className="px-4 py-3 text-brand-primary font-semibold">{p.name}</td>
                  <td className="px-4 py-3 text-brand-secondary">{p.client.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge name={p.status.name} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link className="text-sm font-semibold text-brand-accent hover:underline" href={`/projects/${p.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-brand-secondary" colSpan={5}>
                    No projects yet.
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
