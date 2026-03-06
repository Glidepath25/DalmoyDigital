"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { storeLocalBuffer } from "@/lib/storage/local";
import { hasPermission } from "@/lib/rbac";

const UploadSchema = z.object({
  categoryOptionId: z.string().uuid().optional().or(z.literal(""))
});

export async function uploadAttachment(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/attachments?error=forbidden`);

  const parsed = UploadSchema.safeParse({
    categoryOptionId: formData.get("categoryOptionId")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/attachments?error=invalid`);

  const file = formData.get("file");
  if (!(file instanceof File)) redirect(`/projects/${projectId}/attachments?error=missing_file`);
  if (file.size <= 0) redirect(`/projects/${projectId}/attachments?error=empty_file`);

  let storedFileId: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeLocalBuffer({
      originalName: file.name || "upload",
      buffer,
      prefix: `project_${projectId}`
    });

    const created = await db.storedFile.create({
      data: {
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        originalName: file.name || "upload",
        mimeType: file.type || null,
        sizeBytes: stored.sizeBytes,
        uploadedById: userId
      }
    });

    storedFileId = created.id;
  } catch {
    redirect(`/projects/${projectId}/attachments?error=store_failed`);
  }

  try {
    await db.projectAttachment.create({
      data: {
        projectId,
        fileId: storedFileId,
        categoryOptionId: parsed.data.categoryOptionId || null,
        uploadedById: userId
      }
    });
  } catch {
    redirect(`/projects/${projectId}/attachments?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/attachments`);
  redirect(`/projects/${projectId}/attachments?saved=1`);
}

