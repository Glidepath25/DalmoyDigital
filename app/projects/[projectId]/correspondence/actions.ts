"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { writeAuditEntry } from "@/lib/audit/write";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const CreateCorrespondenceSchema = z.object({
  fromAddress: z.string().trim().min(1).max(200),
  toAddress: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(300),
  aiSummary: z.string().trim().max(2000).optional().or(z.literal("")),
  occurredAt: z.string().trim().min(1)
});

export async function createCorrespondence(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/correspondence?error=forbidden`);

  const parsed = CreateCorrespondenceSchema.safeParse({
    fromAddress: formData.get("fromAddress"),
    toAddress: formData.get("toAddress"),
    subject: formData.get("subject"),
    aiSummary: formData.get("aiSummary"),
    occurredAt: formData.get("occurredAt")
  });

  if (!parsed.success) redirect(`/projects/${projectId}/correspondence?error=invalid`);

  const occurredAt = new Date(parsed.data.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) redirect(`/projects/${projectId}/correspondence?error=invalid_date`);

  try {
    const created = await db.projectCorrespondence.create({
      data: {
        projectId,
        fromAddress: parsed.data.fromAddress,
        toAddress: parsed.data.toAddress,
        subject: parsed.data.subject,
        aiSummary: parsed.data.aiSummary?.trim() || null,
        occurredAt,
        sourceType: "manual",
        provider: "manual",
        createdById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "correspondence",
      entityId: created.id,
      actionType: "create",
      summary: `Correspondence added: ${created.subject}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/correspondence?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/correspondence`);
  redirect(`/projects/${projectId}/correspondence?saved=1`);
}

export async function deleteCorrespondence(projectId: string, correspondenceId: string) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/correspondence?error=forbidden`);

  try {
    const existing = await db.projectCorrespondence.findUnique({ where: { id: correspondenceId } });
    await db.projectCorrespondence.delete({ where: { id: correspondenceId } });
    await writeAuditEntry({
      projectId,
      entityType: "correspondence",
      entityId: correspondenceId,
      actionType: "delete",
      summary: existing ? `Correspondence deleted: ${existing.subject}` : "Correspondence deleted",
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/correspondence?error=delete_failed`);
  }

  revalidatePath(`/projects/${projectId}/correspondence`);
  redirect(`/projects/${projectId}/correspondence?saved=1`);
}
