import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAuditEntry } from "@/lib/audit/write";
import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type RouteContext = { params: { projectId: string } };

const UuidOrEmptySchema = z.union([z.string().uuid(), z.literal("")]);

function toString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v : "";
}

function parseUuidOrNull(v: string, label: string) {
  const parsed = UuidOrEmptySchema.safeParse(v);
  if (!parsed.success) return { ok: false as const, error: `invalid_${label}` as const };
  return { ok: true as const, value: parsed.data || null };
}

function parseDateOrNull(v: string) {
  const trimmed = v.trim();
  if (!trimmed) return { ok: true as const, value: null };
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return { ok: false as const, error: "invalid_target_date" as const };
  return { ok: true as const, value: d };
}

export async function POST(req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsUpdate);
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const title = toString(form.get("title")).trim();
  const description = toString(form.get("description")).trim() || null;

  if (!title) {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=title_required`, req.url), 303);
  }

  const statusOptionIdRes = parseUuidOrNull(toString(form.get("statusOptionId")), "status");
  if (!statusOptionIdRes.ok) {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=${statusOptionIdRes.error}`, req.url), 303);
  }

  const priorityOptionIdRes = parseUuidOrNull(toString(form.get("priorityOptionId")), "priority");
  if (!priorityOptionIdRes.ok) {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=${priorityOptionIdRes.error}`, req.url), 303);
  }

  const responsibleUserIdRes = parseUuidOrNull(toString(form.get("responsibleUserId")), "responsible");
  if (!responsibleUserIdRes.ok) {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=${responsibleUserIdRes.error}`, req.url), 303);
  }

  const targetRes = parseDateOrNull(toString(form.get("targetClosureDate")));
  if (!targetRes.ok) {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=${targetRes.error}`, req.url), 303);
  }

  try {
    const snag = await db.projectSnag.create({
      data: {
        projectId: ctx.params.projectId,
        title,
        description,
        statusOptionId: statusOptionIdRes.value,
        priorityOptionId: priorityOptionIdRes.value,
        responsibleUserId: responsibleUserIdRes.value,
        targetClosureDate: targetRes.value,
        raisedById: auth.userId,
        updatedById: auth.userId
      }
    });

    await writeAuditEntry({
      projectId: ctx.params.projectId,
      entityType: "snag",
      entityId: snag.id,
      actionType: "create",
      summary: `Snag created: ${snag.title}`,
      performedByUserId: auth.userId
    });
  } catch {
    return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?error=create_failed`, req.url), 303);
  }

  revalidatePath(`/projects/${ctx.params.projectId}/snags`);
  revalidatePath(`/projects/${ctx.params.projectId}/audit`);
  return NextResponse.redirect(new URL(`/projects/${ctx.params.projectId}/snags?saved=1`, req.url), 303);
}

