"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const StatusSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(true)
});

export async function createStatus(formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = StatusSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect("/admin/statuses?error=invalid");

  await db.projectStatus.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      createdById: userId,
      updatedById: userId
    }
  });

  revalidatePath("/admin/statuses");
  redirect("/admin/statuses?saved=1");
}

export async function updateStatus(statusId: string, formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = StatusSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect("/admin/statuses?error=invalid");

  await db.projectStatus.update({
    where: { id: statusId },
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      updatedById: userId
    }
  });

  revalidatePath("/admin/statuses");
  redirect("/admin/statuses?saved=1");
}

export async function archiveStatus(statusId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.projectStatus.update({
    where: { id: statusId },
    data: { archivedAt: new Date(), isActive: false, updatedById: userId }
  });
  revalidatePath("/admin/statuses");
  redirect("/admin/statuses?saved=1");
}

export async function restoreStatus(statusId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.projectStatus.update({
    where: { id: statusId },
    data: { archivedAt: null, isActive: true, updatedById: userId }
  });
  revalidatePath("/admin/statuses");
  redirect("/admin/statuses?saved=1");
}

