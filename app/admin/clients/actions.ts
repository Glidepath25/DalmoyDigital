"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const ClientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(true)
});

export async function createClient(formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect("/admin/clients?error=invalid");

  await db.client.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      createdById: userId,
      updatedById: userId
    }
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=1");
}

export async function updateClient(clientId: string, formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect("/admin/clients?error=invalid");

  await db.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      updatedById: userId
    }
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=1");
}

export async function archiveClient(clientId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.client.update({
    where: { id: clientId },
    data: { archivedAt: new Date(), isActive: false, updatedById: userId }
  });
  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=1");
}

export async function restoreClient(clientId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.client.update({
    where: { id: clientId },
    data: { archivedAt: null, isActive: true, updatedById: userId }
  });
  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=1");
}
