"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditEntry } from "@/lib/audit/write";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const CreateActionSchema = z.object({
  title: z.string().trim().min(1).max(500),
  statusOptionId: z.string().uuid().optional().or(z.literal("")),
  priorityOptionId: z.string().uuid().optional().or(z.literal("")),
  ownerUserId: z.string().uuid().optional().or(z.literal("")),
  requiredClosureDate: z.string().optional().or(z.literal("")),
  actualClosureDate: z.string().optional().or(z.literal(""))
});

const ActionCommentSchema = z.object({
  comment: z.string().trim().min(1).max(2000)
});

function parseDateOrNull(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function createActionItem(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/actions?error=forbidden`);

  const parsed = CreateActionSchema.safeParse({
    title: formData.get("title"),
    statusOptionId: formData.get("statusOptionId"),
    priorityOptionId: formData.get("priorityOptionId"),
    ownerUserId: formData.get("ownerUserId"),
    requiredClosureDate: formData.get("requiredClosureDate"),
    actualClosureDate: formData.get("actualClosureDate")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/actions?error=invalid`);

  try {
    const created = await db.projectActionItem.create({
      data: {
        projectId,
        title: parsed.data.title,
        statusOptionId: parsed.data.statusOptionId || null,
        priorityOptionId: parsed.data.priorityOptionId || null,
        ownerUserId: parsed.data.ownerUserId || null,
        requiredClosureDate: parseDateOrNull(parsed.data.requiredClosureDate) as Date | null,
        actualClosureDate: parseDateOrNull(parsed.data.actualClosureDate) as Date | null,
        createdById: userId,
        updatedById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "action_item",
      entityId: created.id,
      actionType: "create",
      summary: `Action item created: ${created.title}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/actions?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/actions`);
  redirect(`/projects/${projectId}/actions?saved=1`);
}

export async function updateActionItem(projectId: string, actionItemId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/actions?error=forbidden`);

  const parsed = CreateActionSchema.safeParse({
    title: formData.get("title"),
    statusOptionId: formData.get("statusOptionId"),
    priorityOptionId: formData.get("priorityOptionId"),
    ownerUserId: formData.get("ownerUserId"),
    requiredClosureDate: formData.get("requiredClosureDate"),
    actualClosureDate: formData.get("actualClosureDate")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/actions?error=invalid`);

  try {
    const existing = await db.projectActionItem.findUnique({ where: { id: actionItemId } });
    const updated = await db.projectActionItem.update({
      where: { id: actionItemId },
      data: {
        title: parsed.data.title,
        statusOptionId: parsed.data.statusOptionId || null,
        priorityOptionId: parsed.data.priorityOptionId || null,
        ownerUserId: parsed.data.ownerUserId || null,
        requiredClosureDate: parseDateOrNull(parsed.data.requiredClosureDate) as Date | null,
        actualClosureDate: parseDateOrNull(parsed.data.actualClosureDate) as Date | null,
        updatedById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "action_item",
      entityId: updated.id,
      actionType: "update",
      summary: existing ? `Action item updated: ${existing.title}` : `Action item updated: ${updated.title}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/actions?error=update_failed`);
  }

  revalidatePath(`/projects/${projectId}/actions`);
  redirect(`/projects/${projectId}/actions?saved=1`);
}

export async function deleteActionItem(projectId: string, actionItemId: string) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/actions?error=forbidden`);

  try {
    const existing = await db.projectActionItem.findUnique({ where: { id: actionItemId } });
    await db.projectActionItem.delete({ where: { id: actionItemId } });
    await writeAuditEntry({
      projectId,
      entityType: "action_item",
      entityId: actionItemId,
      actionType: "delete",
      summary: existing ? `Action item deleted: ${existing.title}` : "Action item deleted",
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/actions?error=delete_failed`);
  }

  revalidatePath(`/projects/${projectId}/actions`);
  redirect(`/projects/${projectId}/actions?saved=1`);
}

export async function addActionComment(projectId: string, actionItemId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/actions?error=forbidden`);

  const parsed = ActionCommentSchema.safeParse({
    comment: formData.get("comment")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/actions?error=comment_invalid`);

  const actionItem = await db.projectActionItem.findFirst({ where: { id: actionItemId, projectId } });
  if (!actionItem) redirect(`/projects/${projectId}/actions?error=not_found`);

  try {
    const created = await db.projectActionComment.create({
      data: {
        actionItemId,
        userId,
        comment: parsed.data.comment
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "action_comment",
      entityId: created.id,
      actionType: "create",
      summary: `Action comment added: ${actionItem.title}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/actions?error=comment_create_failed`);
  }

  revalidatePath(`/projects/${projectId}/actions`);
  revalidatePath(`/projects/${projectId}/audit`);
  redirect(`/projects/${projectId}/actions?saved=1`);
}
