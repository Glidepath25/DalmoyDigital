"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { storeLocalBuffer } from "@/lib/storage/local";
import { hasPermission } from "@/lib/rbac";

const CreateItemSchema = z.object({
  itemTitle: z.string().trim().min(1).max(300),
  comment: z.string().trim().max(2000).optional().or(z.literal(""))
});

export async function addInspectionItem(projectId: string, reportId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/inspections/${reportId}?error=forbidden`);

  const parsed = CreateItemSchema.safeParse({
    itemTitle: formData.get("itemTitle"),
    comment: formData.get("comment")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/inspections/${reportId}?error=invalid`);

  const file = formData.get("photo");
  let photoFileId: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storeLocalBuffer({
        originalName: file.name || "photo",
        buffer,
        prefix: `inspection_${reportId}`
      });
      const created = await db.storedFile.create({
        data: {
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          originalName: file.name || "photo",
          mimeType: file.type || null,
          sizeBytes: stored.sizeBytes,
          uploadedById: userId
        }
      });
      photoFileId = created.id;
    } catch {
      redirect(`/projects/${projectId}/inspections/${reportId}?error=photo_failed`);
    }
  }

  try {
    await db.siteInspectionItem.create({
      data: {
        reportId,
        itemTitle: parsed.data.itemTitle,
        comment: parsed.data.comment?.trim() || null,
        photoFileId
      }
    });
  } catch {
    redirect(`/projects/${projectId}/inspections/${reportId}?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/inspections/${reportId}`);
  redirect(`/projects/${projectId}/inspections/${reportId}?saved=1`);
}

