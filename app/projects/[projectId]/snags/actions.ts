"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { writeAuditEntry } from "@/lib/audit/write";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";
import { storeLocalBuffer } from "@/lib/storage/local";

const SnagSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  statusOptionId: z.string().uuid().optional().or(z.literal("")),
  priorityOptionId: z.string().uuid().optional().or(z.literal("")),
  responsibleUserId: z.string().uuid().optional().or(z.literal("")),
  targetClosureDate: z.string().optional().or(z.literal("")),
  internalCloseOutComment: z.string().trim().max(5000).optional().or(z.literal("")),
  additionalWorkRequiredComment: z.string().trim().max(5000).optional().or(z.literal(""))
});

function parseDateOrNull(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function inferStatusKind(optionId: string | null | undefined) {
  if (!optionId) return "unknown" as const;
  const opt = await db.lookupOption.findUnique({ where: { id: optionId } });
  const v = (opt?.value ?? "").toLowerCase();
  if (v.includes("rectified")) return "rectified" as const;
  if (v.includes("closed")) return "closed" as const;
  if (v.includes("additional")) return "additional_work_required" as const;
  if (v.includes("in_progress") || v.includes("progress")) return "in_progress" as const;
  if (v.includes("open")) return "open" as const;
  return "unknown" as const;
}

export async function createSnag(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/snags?error=forbidden`);

  const parsed = SnagSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    statusOptionId: formData.get("statusOptionId"),
    priorityOptionId: formData.get("priorityOptionId"),
    responsibleUserId: formData.get("responsibleUserId"),
    targetClosureDate: formData.get("targetClosureDate"),
    internalCloseOutComment: formData.get("internalCloseOutComment"),
    additionalWorkRequiredComment: formData.get("additionalWorkRequiredComment")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/snags?error=invalid`);

  try {
    const snag = await db.projectSnag.create({
      data: {
        projectId,
        title: parsed.data.title,
        description: parsed.data.description?.trim() || null,
        statusOptionId: parsed.data.statusOptionId || null,
        priorityOptionId: parsed.data.priorityOptionId || null,
        responsibleUserId: parsed.data.responsibleUserId || null,
        targetClosureDate: parseDateOrNull(parsed.data.targetClosureDate) as Date | null,
        internalCloseOutComment: parsed.data.internalCloseOutComment?.trim() || null,
        additionalWorkRequiredComment: parsed.data.additionalWorkRequiredComment?.trim() || null,
        raisedById: userId,
        updatedById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "snag",
      entityId: snag.id,
      actionType: "create",
      summary: `Snag created: ${snag.title}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/snags?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/snags`);
  redirect(`/projects/${projectId}/snags?saved=1`);
}

export async function updateSnag(projectId: string, snagId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/snags?error=forbidden`);

  const parsed = SnagSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    statusOptionId: formData.get("statusOptionId"),
    priorityOptionId: formData.get("priorityOptionId"),
    responsibleUserId: formData.get("responsibleUserId"),
    targetClosureDate: formData.get("targetClosureDate"),
    internalCloseOutComment: formData.get("internalCloseOutComment"),
    additionalWorkRequiredComment: formData.get("additionalWorkRequiredComment")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/snags?error=invalid`);

  const existing = await db.projectSnag.findUnique({
    where: { id: snagId },
    include: { statusOption: true, priorityOption: true, responsibleUser: true }
  });
  if (!existing) redirect(`/projects/${projectId}/snags?error=not_found`);

  const newStatusId = parsed.data.statusOptionId || null;
  const statusKind = await inferStatusKind(newStatusId);

  const nextDateRectified =
    statusKind === "rectified" && !existing.dateRectified ? new Date() : statusKind === "open" ? null : existing.dateRectified;
  const nextDateClosed =
    statusKind === "closed" && !existing.dateClosed
      ? new Date()
      : statusKind === "additional_work_required" || statusKind === "open"
        ? null
        : existing.dateClosed;

  try {
    await db.projectSnag.update({
      where: { id: snagId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description?.trim() || null,
        statusOptionId: newStatusId,
        priorityOptionId: parsed.data.priorityOptionId || null,
        responsibleUserId: parsed.data.responsibleUserId || null,
        targetClosureDate: parseDateOrNull(parsed.data.targetClosureDate) as Date | null,
        dateRectified: nextDateRectified,
        dateClosed: nextDateClosed,
        internalCloseOutComment: parsed.data.internalCloseOutComment?.trim() || null,
        additionalWorkRequiredComment: parsed.data.additionalWorkRequiredComment?.trim() || null,
        updatedById: userId
      }
    });

    if (existing.statusOptionId !== newStatusId) {
      await writeAuditEntry({
        projectId,
        entityType: "snag",
        entityId: snagId,
        actionType: "status_change",
        fieldName: "statusOptionId",
        oldValue: existing.statusOption?.label ?? null,
        newValue: newStatusId,
        summary: `Snag status updated: ${existing.title}`,
        performedByUserId: userId
      });
    } else {
      await writeAuditEntry({
        projectId,
        entityType: "snag",
        entityId: snagId,
        actionType: "update",
        summary: `Snag updated: ${existing.title}`,
        performedByUserId: userId
      });
    }
  } catch {
    redirect(`/projects/${projectId}/snags?error=update_failed`);
  }

  revalidatePath(`/projects/${projectId}/snags`);
  redirect(`/projects/${projectId}/snags?saved=1`);
}

export async function uploadSnagPhoto(projectId: string, snagId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/snags?error=forbidden`);

  const file = formData.get("photo");
  if (!(file instanceof File)) redirect(`/projects/${projectId}/snags?error=missing_file`);
  if (file.size <= 0) redirect(`/projects/${projectId}/snags?error=empty_file`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeLocalBuffer({
      originalName: file.name || "snag-photo",
      buffer,
      prefix: `snag_${snagId}`
    });

    const createdFile = await db.storedFile.create({
      data: {
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        originalName: file.name || "snag-photo",
        mimeType: file.type || null,
        sizeBytes: stored.sizeBytes,
        uploadedById: userId
      }
    });

    await db.projectSnagAttachment.create({
      data: {
        snagId,
        fileId: createdFile.id
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "snag_attachment",
      entityId: createdFile.id,
      actionType: "create",
      summary: "Snag photo uploaded",
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/snags?error=upload_failed`);
  }

  revalidatePath(`/projects/${projectId}/snags`);
  redirect(`/projects/${projectId}/snags?saved=1`);
}

