"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const CreateReportSchema = z.object({
  inspectionDate: z.string().trim().min(1)
});

export async function createInspectionReport(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/inspections?error=forbidden`);

  const parsed = CreateReportSchema.safeParse({
    inspectionDate: formData.get("inspectionDate")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/inspections/new?error=invalid`);

  const inspectionDate = new Date(parsed.data.inspectionDate);
  if (Number.isNaN(inspectionDate.getTime())) redirect(`/projects/${projectId}/inspections/new?error=invalid_date`);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) redirect(`/projects/${projectId}/inspections?error=not_found`);

  let reportId: string;
  try {
    const report = await db.siteInspectionReport.create({
      data: {
        projectId,
        completedByUserId: userId,
        inspectionDate,
        projectReferenceSnapshot: project.reference
      }
    });
    reportId = report.id;
  } catch {
    redirect(`/projects/${projectId}/inspections/new?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/inspections`);
  redirect(`/projects/${projectId}/inspections/${reportId}?created=1`);
}

