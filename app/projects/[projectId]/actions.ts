"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";
import { writeAuditEntry } from "@/lib/audit/write";

const UpdateProjectSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  clientId: z.string().uuid(),
  statusId: z.string().uuid(),
  ragOptionId: z.string().uuid().optional().or(z.literal("")),
  seniorManagerUserId: z.string().uuid().optional().or(z.literal("")),
  siteManagerUserId: z.string().uuid().optional().or(z.literal("")),
  contractManagerUserId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal(""))
});

export async function updateProject(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  const canEdit = await hasPermission(userId, PERMISSIONS.projectsUpdate);
  if (!canEdit) redirect(`/projects/${projectId}`);

  const existing = await db.project.findUnique({
    where: { id: projectId },
    include: { client: true, status: true, ragOption: true }
  });
  if (!existing) redirect(`/projects/${projectId}?error=not_found`);

  const parsed = UpdateProjectSchema.safeParse({
    reference: formData.get("reference"),
    name: formData.get("name"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
    statusId: formData.get("statusId"),
    ragOptionId: formData.get("ragOptionId"),
    seniorManagerUserId: formData.get("seniorManagerUserId"),
    siteManagerUserId: formData.get("siteManagerUserId"),
    contractManagerUserId: formData.get("contractManagerUserId"),
    dueDate: formData.get("dueDate")
  });

  if (!parsed.success) redirect(`/projects/${projectId}?error=invalid`);

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) redirect(`/projects/${projectId}?error=invalid_date`);

  try {
    await db.project.update({
      where: { id: projectId },
      data: {
        reference: parsed.data.reference,
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        clientId: parsed.data.clientId,
        statusId: parsed.data.statusId,
        ragOptionId: parsed.data.ragOptionId || null,
        seniorManagerUserId: parsed.data.seniorManagerUserId || null,
        siteManagerUserId: parsed.data.siteManagerUserId || null,
        contractManagerUserId: parsed.data.contractManagerUserId || null,
        dueDate,
        updatedById: userId
      }
    });
  } catch {
    redirect(`/projects/${projectId}?error=save_failed`);
  }

  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null; summary: string }> = [];

  if (existing.reference !== parsed.data.reference) {
    changes.push({
      field: "reference",
      oldValue: existing.reference,
      newValue: parsed.data.reference,
      summary: `Project reference changed from ${existing.reference} to ${parsed.data.reference}`
    });
  }
  if (existing.name !== parsed.data.name) {
    changes.push({
      field: "name",
      oldValue: existing.name,
      newValue: parsed.data.name,
      summary: "Project name updated"
    });
  }
  if ((existing.notes ?? "") !== (parsed.data.notes ?? "")) {
    changes.push({
      field: "notes",
      oldValue: null,
      newValue: null,
      summary: "Project notes updated"
    });
  }
  if (existing.clientId !== parsed.data.clientId) {
    changes.push({
      field: "clientId",
      oldValue: existing.client.name,
      newValue: parsed.data.clientId,
      summary: "Project client changed"
    });
  }
  if (existing.statusId !== parsed.data.statusId) {
    changes.push({
      field: "statusId",
      oldValue: existing.status.name,
      newValue: parsed.data.statusId,
      summary: "Project status changed"
    });
  }
  if ((existing.ragOptionId ?? "") !== (parsed.data.ragOptionId ?? "")) {
    changes.push({
      field: "ragOptionId",
      oldValue: existing.ragOption?.label ?? null,
      newValue: parsed.data.ragOptionId || null,
      summary: "Project RAG changed"
    });
  }
  if ((existing.seniorManagerUserId ?? "") !== (parsed.data.seniorManagerUserId ?? "")) {
    changes.push({
      field: "seniorManagerUserId",
      oldValue: existing.seniorManagerUserId ?? null,
      newValue: parsed.data.seniorManagerUserId || null,
      summary: "Senior manager updated"
    });
  }
  if ((existing.siteManagerUserId ?? "") !== (parsed.data.siteManagerUserId ?? "")) {
    changes.push({
      field: "siteManagerUserId",
      oldValue: existing.siteManagerUserId ?? null,
      newValue: parsed.data.siteManagerUserId || null,
      summary: "Site manager updated"
    });
  }
  if ((existing.contractManagerUserId ?? "") !== (parsed.data.contractManagerUserId ?? "")) {
    changes.push({
      field: "contractManagerUserId",
      oldValue: existing.contractManagerUserId ?? null,
      newValue: parsed.data.contractManagerUserId || null,
      summary: "Contract manager updated"
    });
  }
  if ((existing.dueDate?.toISOString() ?? "") !== (dueDate?.toISOString() ?? "")) {
    changes.push({
      field: "dueDate",
      oldValue: existing.dueDate?.toISOString() ?? null,
      newValue: dueDate?.toISOString() ?? null,
      summary: "Due date updated"
    });
  }

  for (const c of changes) {
    await writeAuditEntry({
      projectId,
      entityType: "project",
      entityId: projectId,
      actionType: "update",
      fieldName: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      summary: c.summary,
      performedByUserId: userId
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}?saved=1`);
}
