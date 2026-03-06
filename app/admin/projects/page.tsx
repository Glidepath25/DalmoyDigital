import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Showing the most recently updated projects.</p>
        {canCreate ? (
          <Link
            className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-slate-900 text-white hover:bg-slate-800"
            href="/admin/projects/new"
          >
            New project
          </Link>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left font-medium px-4 py-2">Reference</th>
                <th className="text-left font-medium px-4 py-2">Project</th>
                <th className="text-left font-medium px-4 py-2">Client</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-right font-medium px-4 py-2">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{p.reference}</td>
                  <td className="px-4 py-3 text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-700">{p.client.name}</td>
                  <td className="px-4 py-3 text-slate-700">{p.status.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="text-sm text-blue-700 hover:underline" href={`/projects/${p.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={5}>
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
