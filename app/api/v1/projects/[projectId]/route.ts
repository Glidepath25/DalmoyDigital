import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type RouteContext = { params: { projectId: string } };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const project = await db.project.findUnique({
    where: { id: ctx.params.projectId },
    include: { client: true, status: true }
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: project.id,
    reference: project.reference,
    name: project.name,
    notes: project.notes,
    client: { id: project.clientId, name: project.client.name },
    status: { id: project.statusId, name: project.status.name },
    dueDate: project.dueDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}

const PatchBodySchema = z.object({
  reference: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  notes: z.string().max(5000).nullable().optional(),
  clientId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  dueDate: z.string().datetime().nullable().optional()
});

export async function PATCH(req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsUpdate);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await db.project.update({
      where: { id: ctx.params.projectId },
      data: {
        ...(parsed.data.reference ? { reference: parsed.data.reference.trim() } : {}),
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
        ...(parsed.data.clientId ? { clientId: parsed.data.clientId } : {}),
        ...(parsed.data.statusId ? { statusId: parsed.data.statusId } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
        updatedById: auth.userId
      }
    });
  } catch {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

