"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { writeAuditEntry } from "@/lib/audit/write";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const FinanceSchema = z.object({
  item: z.string().trim().min(1).max(300),
  supplier: z.string().trim().max(200).optional().or(z.literal("")),
  tenderedCost: z.string().trim().max(50).optional().or(z.literal("")),
  qty: z.string().trim().max(50).optional().or(z.literal("")),
  actualCost: z.string().trim().max(50).optional().or(z.literal("")),
  invoicedCost: z.string().trim().max(50).optional().or(z.literal(""))
});

function toDecimalOrNull(v: string | undefined) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(v);
}

export async function createFinanceLine(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/finance?error=forbidden`);

  const parsed = FinanceSchema.safeParse({
    item: formData.get("item"),
    supplier: formData.get("supplier"),
    tenderedCost: formData.get("tenderedCost"),
    qty: formData.get("qty"),
    actualCost: formData.get("actualCost"),
    invoicedCost: formData.get("invoicedCost")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/finance?error=invalid`);

  try {
    const created = await db.projectFinanceLine.create({
      data: {
        projectId,
        item: parsed.data.item,
        supplier: parsed.data.supplier?.trim() || null,
        tenderedCost: toDecimalOrNull(parsed.data.tenderedCost),
        qty: toDecimalOrNull(parsed.data.qty),
        actualCost: toDecimalOrNull(parsed.data.actualCost),
        invoicedCost: toDecimalOrNull(parsed.data.invoicedCost),
        createdById: userId,
        updatedById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "finance_line",
      entityId: created.id,
      actionType: "create",
      summary: `Finance line added: ${created.item}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/finance?error=create_failed`);
  }

  revalidatePath(`/projects/${projectId}/finance`);
  redirect(`/projects/${projectId}/finance?saved=1`);
}

export async function updateFinanceLine(projectId: string, lineId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/finance?error=forbidden`);

  const parsed = FinanceSchema.safeParse({
    item: formData.get("item"),
    supplier: formData.get("supplier"),
    tenderedCost: formData.get("tenderedCost"),
    qty: formData.get("qty"),
    actualCost: formData.get("actualCost"),
    invoicedCost: formData.get("invoicedCost")
  });
  if (!parsed.success) redirect(`/projects/${projectId}/finance?error=invalid`);

  try {
    const existing = await db.projectFinanceLine.findUnique({ where: { id: lineId } });
    const updated = await db.projectFinanceLine.update({
      where: { id: lineId },
      data: {
        item: parsed.data.item,
        supplier: parsed.data.supplier?.trim() || null,
        tenderedCost: toDecimalOrNull(parsed.data.tenderedCost),
        qty: toDecimalOrNull(parsed.data.qty),
        actualCost: toDecimalOrNull(parsed.data.actualCost),
        invoicedCost: toDecimalOrNull(parsed.data.invoicedCost),
        updatedById: userId
      }
    });

    await writeAuditEntry({
      projectId,
      entityType: "finance_line",
      entityId: updated.id,
      actionType: "update",
      summary: existing ? `Finance line updated: ${existing.item}` : `Finance line updated: ${updated.item}`,
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/finance?error=update_failed`);
  }

  revalidatePath(`/projects/${projectId}/finance`);
  redirect(`/projects/${projectId}/finance?saved=1`);
}

export async function deleteFinanceLine(projectId: string, lineId: string) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}/finance?error=forbidden`);

  try {
    const existing = await db.projectFinanceLine.findUnique({ where: { id: lineId } });
    await db.projectFinanceLine.delete({ where: { id: lineId } });
    await writeAuditEntry({
      projectId,
      entityType: "finance_line",
      entityId: lineId,
      actionType: "delete",
      summary: existing ? `Finance line deleted: ${existing.item}` : "Finance line deleted",
      performedByUserId: userId
    });
  } catch {
    redirect(`/projects/${projectId}/finance?error=delete_failed`);
  }

  revalidatePath(`/projects/${projectId}/finance`);
  redirect(`/projects/${projectId}/finance?saved=1`);
}
