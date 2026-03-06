import type React from "react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ProjectTabsNav } from "@/components/app/project-tabs-nav";
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

  const subtitle = `${project.reference} \u2022 ${project.client.name}`;

  return (
    <AppShell title={project.name} subtitle={subtitle}>
      <div className="space-y-4">
        <ProjectTabsNav projectId={project.id} />
        {props.children}
      </div>
    </AppShell>
  );
}
