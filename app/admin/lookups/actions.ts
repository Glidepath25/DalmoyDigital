"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const LookupTypeSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores"),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(true)
});

export async function createLookupType(formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = LookupTypeSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect("/admin/lookups?error=invalid");

  try {
    await db.lookupType.create({
      data: {
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        createdById: userId,
        updatedById: userId
      }
    });
  } catch {
    redirect("/admin/lookups?error=create_failed");
  }

  revalidatePath("/admin/lookups");
  redirect("/admin/lookups?saved=1");
}

export async function archiveLookupType(lookupTypeId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.lookupType.update({
    where: { id: lookupTypeId },
    data: { archivedAt: new Date(), isActive: false, updatedById: userId }
  });
  revalidatePath("/admin/lookups");
  redirect("/admin/lookups?saved=1");
}

export async function restoreLookupType(lookupTypeId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.lookupType.update({
    where: { id: lookupTypeId },
    data: { archivedAt: null, isActive: true, updatedById: userId }
  });
  revalidatePath("/admin/lookups");
  redirect("/admin/lookups?saved=1");
}

