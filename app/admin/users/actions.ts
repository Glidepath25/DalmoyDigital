"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { PERMISSIONS } from "@/lib/permissions";

const CreateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
  roleIds: z.array(z.string().uuid()).min(1)
});

export async function createUser(formData: FormData) {
  await requirePermission(PERMISSIONS.usersManage);

  const roleIds = formData.getAll("roleIds").map(String);
  const parsed = CreateUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    roleIds
  });
  if (!parsed.success) redirect("/admin/users?error=invalid");

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await db.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name || null,
        passwordHash,
        isActive: true,
        roles: {
          create: parsed.data.roleIds.map((roleId) => ({ roleId }))
        }
      }
    });
  } catch {
    redirect("/admin/users?error=create_failed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

const UpdateUserSchema = z.object({
  name: z.string().trim().max(200).optional().or(z.literal("")),
  isActive: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(true),
  roleIds: z.array(z.string().uuid()).min(1),
  password: z.string().min(8).max(200).optional().or(z.literal(""))
});

export async function updateUser(userId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.usersManage);

  const roleIds = formData.getAll("roleIds").map(String);
  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    isActive: formData.get("isActive"),
    roleIds,
    password: formData.get("password")
  });
  if (!parsed.success) redirect("/admin/users?error=invalid");

  const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : null;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name || null,
        isActive: parsed.data.isActive,
        ...(passwordHash ? { passwordHash } : {})
      }
    });

    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.createMany({ data: parsed.data.roleIds.map((roleId) => ({ userId, roleId })) });
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}
