import { db } from "@/lib/db";

export type AuditEntryInput = {
  projectId: string;
  entityType: string;
  entityId?: string | null;
  actionType: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  summary?: string | null;
  performedByUserId?: string | null;
  performedAt?: Date;
};

export async function writeAuditEntry(input: AuditEntryInput) {
  try {
    await db.projectAuditTrailEntry.create({
      data: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actionType: input.actionType,
        fieldName: input.fieldName ?? null,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        summary: input.summary ?? null,
        performedByUserId: input.performedByUserId ?? null,
        performedAt: input.performedAt ?? new Date()
      }
    });
  } catch {
    // Non-fatal: audit logging must never break core workflows.
  }
}

