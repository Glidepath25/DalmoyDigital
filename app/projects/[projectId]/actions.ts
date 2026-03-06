"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const UpdateProjectSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  clientId: z.string().uuid(),
  statusId: z.string().uuid(),
  dueDate: z.string().optional().or(z.literal(""))
});

export async function updateProject(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}`);

  const parsed = UpdateProjectSchema.safeParse({
    reference: formData.get("reference"),
    name: formData.get("name"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
    statusId: formData.get("statusId"),
    dueDate: formData.get("dueDate")
  });

  if (!parsed.success) redirect(`/projects/${projectId}?error=invalid`);

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) redirect(`/projects/${projectId}?error=invalid_date`);

  try {
    await db.project.update({
      where: { id: projectId },
      data: {
        reference: parsed.data.reference,
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        clientId: parsed.data.clientId,
        statusId: parsed.data.statusId,
        dueDate,
        updatedById: userId
      }
    });
  } catch {
    redirect(`/projects/${projectId}?error=save_failed`);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}?saved=1`);
}

