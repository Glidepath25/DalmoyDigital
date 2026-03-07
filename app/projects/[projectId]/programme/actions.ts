"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditEntry } from "@/lib/audit/write";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_PROGRAMME_MILESTONES } from "@/lib/project-workspace/milestones";
import { hasPermission } from "@/lib/rbac";

const UpdateMilestoneSchema = z.object({
  ragOptionId: z.string().uuid().optional().or(z.literal("")),
  durationDays: z.string().trim().max(10).optional().or(z.literal("")),
  programStart: z.string().optional().or(z.literal("")),
  forecastStart: z.string().optional().or(z.literal("")),
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
    await writeAuditEntry({
      projectId,
      entityType: "programme",
      entityId: null,
      actionType: "init",
      summary: "Programme milestones initialised",
      performedByUserId: userId
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
    durationDays: formData.get("durationDays"),
    programStart: formData.get("programStart"),
    forecastStart: formData.get("forecastStart"),
    forecastFinish: formData.get("forecastFinish")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/programme?error=invalid`);

  const existing = await db.projectMilestone.findUnique({
    where: { id: milestoneId },
    include: { ragOption: true }
  });
  if (!existing) redirect(`/projects/${projectId}/programme?error=not_found`);

  const nextProgramStart = parseDateOrNull(parsed.data.programStart) as Date | null;

  const durationRaw = parsed.data.durationDays?.trim() ?? "";
  const durationDays = durationRaw ? Number(durationRaw) : undefined;
  if (durationDays !== undefined && (!Number.isFinite(durationDays) || durationDays < 0)) {
    redirect(`/projects/${projectId}/programme?error=invalid_duration`);
  }
  const nextDurationDays = durationDays === undefined ? existing.durationDays : Math.floor(durationDays);

  const nextProgramFinish =
    nextProgramStart && nextDurationDays !== null
      ? new Date(nextProgramStart.getTime() + nextDurationDays * 24 * 60 * 60 * 1000)
      : null;

  const forecastStartInput = parseDateOrNull(parsed.data.forecastStart) as Date | null;
  const forecastFinishInput = parseDateOrNull(parsed.data.forecastFinish) as Date | null;

  const nextForecastStart =
    parsed.data.forecastStart && parsed.data.forecastStart.trim() !== ""
      ? forecastStartInput
      : existing.forecastStart ?? (nextProgramStart ? nextProgramStart : null);

  const nextForecastFinish =
    parsed.data.forecastFinish && parsed.data.forecastFinish.trim() !== ""
      ? forecastFinishInput
      : existing.forecastFinish ?? (nextProgramFinish ? nextProgramFinish : null);

  const data = {
    ragOptionId: parsed.data.ragOptionId || null,
    durationDays: nextDurationDays,
    programStart: nextProgramStart,
    programFinish: nextProgramFinish,
    forecastStart: nextForecastStart,
    forecastFinish: nextForecastFinish
  };

  try {
    await db.projectMilestone.update({
      where: { id: milestoneId },
      data: { ...data, updatedById: userId }
    });

    await writeAuditEntry({
      projectId,
      entityType: "milestone",
      entityId: milestoneId,
      actionType: "update",
      summary: `Programme milestone updated: ${existing.milestoneName}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/programme?error=update_failed`);
  }

  revalidatePath(`/projects/${projectId}/programme`);
  redirect(`/projects/${projectId}/programme?saved=1`);
}
