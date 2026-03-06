"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_PROGRAMME_MILESTONES } from "@/lib/project-workspace/milestones";
import { hasPermission } from "@/lib/rbac";

const UpdateMilestoneSchema = z.object({
  ragOptionId: z.string().uuid().optional().or(z.literal("")),
  programStart: z.string().optional().or(z.literal("")),
  forecastStart: z.string().optional().or(z.literal("")),
  programFinish: z.string().optional().or(z.literal("")),
  forecastFinish: z.string().optional().or(z.literal(""))
});

function parseDateOrNull(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function initialiseProgramme(projectId: string) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/programme?error=forbidden`);

  const existing = await db.projectMilestone.count({ where: { projectId } });
  if (existing > 0) redirect(`/projects/${projectId}/programme?saved=1`);

  try {
    await db.projectMilestone.createMany({
      data: DEFAULT_PROGRAMME_MILESTONES.map((m) => ({
        projectId,
        milestoneKey: m.key,
        milestoneName: m.name,
        sortOrder: m.sortOrder,
        createdById: userId,
        updatedById: userId
      }))
    });
  } catch {
    redirect(`/projects/${projectId}/programme?error=init_failed`);
  }

  revalidatePath(`/projects/${projectId}/programme`);
  redirect(`/projects/${projectId}/programme?saved=1`);
}

export async function updateMilestone(projectId: string, milestoneId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/programme?error=forbidden`);

  const parsed = UpdateMilestoneSchema.safeParse({
    ragOptionId: formData.get("ragOptionId"),
    programStart: formData.get("programStart"),
    forecastStart: formData.get("forecastStart"),
    programFinish: formData.get("programFinish"),
    forecastFinish: formData.get("forecastFinish")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/programme?error=invalid`);

  const data = {
    ragOptionId: parsed.data.ragOptionId || null,
    programStart: parseDateOrNull(parsed.data.programStart) as Date | null,
    forecastStart: parseDateOrNull(parsed.data.forecastStart) as Date | null,
    programFinish: parseDateOrNull(parsed.data.programFinish) as Date | null,
    forecastFinish: parseDateOrNull(parsed.data.forecastFinish) as Date | null
  };

  try {
    await db.projectMilestone.update({
      where: { id: milestoneId },
      data: { ...data, updatedById: userId }
    });
  } catch {
    redirect(`/projects/${projectId}/programme?error=update_failed`);
  }

  revalidatePath(`/projects/${projectId}/programme`);
  redirect(`/projects/${projectId}/programme?saved=1`);
}

