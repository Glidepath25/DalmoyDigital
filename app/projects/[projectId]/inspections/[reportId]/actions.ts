"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { writeAuditEntry } from "@/lib/audit/write";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { storeLocalBuffer } from "@/lib/storage/local";
import { hasPermission } from "@/lib/rbac";

const CreateItemSchema = z.object({
  itemTitle: z.string().trim().min(1).max(300),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  statusOptionId: z.string().uuid().optional().or(z.literal("")),
  severityOptionId: z.string().uuid().optional().or(z.literal("")),
  assignedToUserId: z.string().uuid().optional().or(z.literal("")),
  actionRequired: z.string().trim().max(2000).optional().or(z.literal(""))
});

export async function addInspectionItem(projectId: string, reportId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/inspections/${reportId}?error=forbidden`);

  const parsed = CreateItemSchema.safeParse({
    itemTitle: formData.get("itemTitle"),
    comment: formData.get("comment"),
    statusOptionId: formData.get("statusOptionId"),
    severityOptionId: formData.get("severityOptionId"),
    assignedToUserId: formData.get("assignedToUserId"),
    actionRequired: formData.get("actionRequired")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/inspections/${reportId}?error=invalid`);

  const isSnag = formData.get("isSnag") === "on";

  const report = await db.siteInspectionReport.findFirst({
    where: { id: reportId, projectId },
    include: { project: true }
  });
  if (!report) redirect(`/projects/${projectId}/inspections/${reportId}?error=not_found`);

  const [snagStatusType, snagPriorityType] = await Promise.all([
    db.lookupType.findUnique({
      where: { key: "snag_status" },
      include: { options: { where: { isActive: true, archivedAt: null } } }
    }),
    db.lookupType.findUnique({
      where: { key: "snag_priority" },
      include: { options: { where: { isActive: true, archivedAt: null } } }
    })
  ]);

  const openStatusOptionId =
    snagStatusType?.options.find((o) => (o.value ?? o.label).toLowerCase().includes("open"))?.id ?? null;
  const mediumPriorityOptionId =
    snagPriorityType?.options.find((o) => (o.value ?? o.label).toLowerCase().includes("medium"))?.id ?? null;

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

  const statusOptionId = parsed.data.statusOptionId ? parsed.data.statusOptionId : null;
  const severityOptionId = parsed.data.severityOptionId ? parsed.data.severityOptionId : null;
  const assignedToUserId = parsed.data.assignedToUserId ? parsed.data.assignedToUserId : null;
  const actionRequired = parsed.data.actionRequired?.trim() ? parsed.data.actionRequired.trim() : null;

  let createdItemId: string | null = null;
  let createdSnagId: string | null = null;

  try {
    const result = await db.$transaction(async (tx) => {
      let snagId: string | null = null;
      if (isSnag) {
        const snag = await tx.projectSnag.create({
          data: {
            projectId: report.projectId,
            title: parsed.data.itemTitle,
            description: parsed.data.comment?.trim() || null,
            statusOptionId: openStatusOptionId,
            priorityOptionId: mediumPriorityOptionId,
            responsibleUserId: assignedToUserId,
            raisedById: userId,
            updatedById: userId
          }
        });
        snagId = snag.id;
      }

      const item = await tx.siteInspectionItem.create({
        data: {
          reportId,
          itemTitle: parsed.data.itemTitle,
          comment: parsed.data.comment?.trim() || null,
          statusOptionId,
          severityOptionId,
          assignedToUserId,
          actionRequired,
          isSnag,
          snagId,
          photoFileId
        }
      });

      return { itemId: item.id, snagId };
    });

    createdItemId = result.itemId;
    createdSnagId = result.snagId;
  } catch {
    redirect(`/projects/${projectId}/inspections/${reportId}?error=create_failed`);
  }

  await writeAuditEntry({
    projectId: report.projectId,
    entityType: "inspection_item",
    entityId: createdItemId,
    actionType: "create",
    summary: `Inspection item added to report ${reportId}`,
    performedByUserId: userId
  });
  if (createdSnagId) {
    await writeAuditEntry({
      projectId: report.projectId,
      entityType: "snag",
      entityId: createdSnagId,
      actionType: "create",
      summary: `Snag raised from site inspection report ${reportId}`,
      performedByUserId: userId
    });
  }

  revalidatePath(`/projects/${projectId}/inspections/${reportId}`);
  if (createdSnagId) revalidatePath(`/projects/${projectId}/snags`);
  revalidatePath(`/projects/${projectId}/audit`);
  redirect(`/projects/${projectId}/inspections/${reportId}?saved=1`);
}
