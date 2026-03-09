import type React from "react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { DownloadLink } from "@/components/app/download-link";
import { ProjectTabsNav } from "@/components/app/project-tabs-nav";
import { DalmoyLogo } from "@/components/brand/dalmoy-logo";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ProjectWorkspaceLayout(props: { params: { projectId: string }; children: React.ReactNode }) {
  await requirePermission(PERMISSIONS.projectsRead);

  const project = await db.project.findUnique({
    where: { id: props.params.projectId },
    include: { client: true, status: true }
  });

  if (!project) notFound();

  const subtitle = `${project.reference} | ${project.client.name}`;

  return (
    <AppShell
      title={project.name}
      subtitle={subtitle}
      actions={<DownloadLink href={`/api/v1/projects/${project.id}/pack`} label="Download project pack (PDF)" variant="primary" />}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-shellElevated bg-brand-shell p-3 text-brand-foreground shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DalmoyLogo size="sm" surface="dark" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-foreground/70">
              Project Delivery Workspace
            </p>
          </div>
        </div>
        <ProjectTabsNav projectId={project.id} />
        {props.children}
      </div>
    </AppShell>
  );
}
