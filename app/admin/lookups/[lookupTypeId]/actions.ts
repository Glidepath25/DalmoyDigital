"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const LookupOptionSchema = z.object({
  label: z.string().trim().min(1).max(200),
  value: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, underscores"),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(0),
  isActive: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(true)
});

export async function createLookupOption(lookupTypeId: string, formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = LookupOptionSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect(`/admin/lookups/${lookupTypeId}?error=invalid`);

  try {
    await db.lookupOption.create({
      data: {
        lookupTypeId,
        label: parsed.data.label,
        value: parsed.data.value,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        createdById: userId,
        updatedById: userId
      }
    });
  } catch {
    redirect(`/admin/lookups/${lookupTypeId}?error=create_failed`);
  }

  revalidatePath(`/admin/lookups/${lookupTypeId}`);
  redirect(`/admin/lookups/${lookupTypeId}?saved=1`);
}

export async function updateLookupOption(lookupTypeId: string, optionId: string, formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  const parsed = LookupOptionSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive")
  });
  if (!parsed.success) redirect(`/admin/lookups/${lookupTypeId}?error=invalid`);

  await db.lookupOption.update({
    where: { id: optionId },
    data: {
      label: parsed.data.label,
      value: parsed.data.value,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      updatedById: userId
    }
  });

  revalidatePath(`/admin/lookups/${lookupTypeId}`);
  redirect(`/admin/lookups/${lookupTypeId}?saved=1`);
}

export async function archiveLookupOption(lookupTypeId: string, optionId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.lookupOption.update({
    where: { id: optionId },
    data: { archivedAt: new Date(), isActive: false, updatedById: userId }
  });
  revalidatePath(`/admin/lookups/${lookupTypeId}`);
  redirect(`/admin/lookups/${lookupTypeId}?saved=1`);
}

export async function restoreLookupOption(lookupTypeId: string, optionId: string) {
  const userId = await requirePermission(PERMISSIONS.lookupsManage);
  await db.lookupOption.update({
    where: { id: optionId },
    data: { archivedAt: null, isActive: true, updatedById: userId }
  });
  revalidatePath(`/admin/lookups/${lookupTypeId}`);
  redirect(`/admin/lookups/${lookupTypeId}?saved=1`);
}

