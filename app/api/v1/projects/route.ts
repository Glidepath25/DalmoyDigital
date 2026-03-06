import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_PROGRAMME_MILESTONES } from "@/lib/project-workspace/milestones";

const ListQuerySchema = z.object({
  q: z.string().optional(),
  clientId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export async function GET(req: Request) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    clientId: url.searchParams.get("clientId") ?? undefined,
    statusId: url.searchParams.get("statusId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const where: Prisma.ProjectWhereInput = {};
  if (parsed.data.q) {
    where.OR = [
      { name: { contains: parsed.data.q, mode: "insensitive" } },
      { reference: { contains: parsed.data.q, mode: "insensitive" } }
    ];
  }
  if (parsed.data.clientId) where.clientId = parsed.data.clientId;
  if (parsed.data.statusId) where.statusId = parsed.data.statusId;

  const skip = (parsed.data.page - 1) * parsed.data.pageSize;
  const [total, items] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      include: { client: true, status: true },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: parsed.data.pageSize
    })
  ]);

  return NextResponse.json({
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    total,
    items: items.map((p) => ({
      id: p.id,
      reference: p.reference,
      name: p.name,
      notes: p.notes,
      client: { id: p.clientId, name: p.client.name },
      status: { id: p.statusId, name: p.status.name },
      dueDate: p.dueDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }))
  });
}

const CreateBodySchema = z.object({
  reference: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  notes: z.string().max(5000).optional().nullable(),
  clientId: z.string().uuid(),
  statusId: z.string().uuid(),
  dueDate: z.string().datetime().optional().nullable()
});

export async function POST(req: Request) {
  const auth = await requireApiPermission(PERMISSIONS.projectsCreate);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const project = await db.project.create({
      data: {
        reference: parsed.data.reference.trim(),
        name: parsed.data.name.trim(),
        notes: parsed.data.notes?.trim() || null,
        clientId: parsed.data.clientId,
        statusId: parsed.data.statusId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdById: auth.userId,
        updatedById: auth.userId
      }
    });

    // Non-fatal defaults for the programme module
    try {
      await db.projectMilestone.createMany({
        data: DEFAULT_PROGRAMME_MILESTONES.map((m) => ({
          projectId: project.id,
          milestoneKey: m.key,
          milestoneName: m.name,
          sortOrder: m.sortOrder,
          createdById: auth.userId,
          updatedById: auth.userId
        })),
        skipDuplicates: true
      });
    } catch {
      // ignore
    }
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }
}
