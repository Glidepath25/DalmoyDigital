"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { DEFAULT_PROGRAMME_MILESTONES } from "@/lib/project-workspace/milestones";

const CreateProjectSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  clientId: z.string().uuid(),
  statusId: z.string().uuid(),
  dueDate: z.string().optional().or(z.literal(""))
});

export async function createProject(origin: "admin" | "app", formData: FormData) {
  const userId = await requirePermission(PERMISSIONS.projectsCreate);

  const raw = {
    reference: String(formData.get("reference") ?? ""),
    name: String(formData.get("name") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    statusId: String(formData.get("statusId") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    notesLength: String(formData.get("notes") ?? "").length
  };
  console.info("[createProject] start", { origin, userId, ...raw });

  const parsed = CreateProjectSchema.safeParse({
    reference: formData.get("reference"),
    name: formData.get("name"),
    notes: formData.get("notes"),
    clientId: formData.get("clientId"),
    statusId: formData.get("statusId"),
    dueDate: formData.get("dueDate")
  });

  const basePath = origin === "admin" ? "/admin/projects/new" : "/projects/new";
  if (!parsed.success) {
    console.warn("[createProject] invalid payload", { origin, userId, issues: parsed.error.issues });
    redirect(`${basePath}?error=invalid`);
  }

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    console.warn("[createProject] invalid due date", { origin, userId, dueDate: parsed.data.dueDate });
    redirect(`${basePath}?error=invalid_date`);
  }

  let projectId: string;
  try {
    const project = await db.project.create({
      data: {
        reference: parsed.data.reference,
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        clientId: parsed.data.clientId,
        statusId: parsed.data.statusId,
        dueDate,
        createdById: userId,
        updatedById: userId
      }
    });

    projectId = project.id;
    console.info("[createProject] created", { origin, userId, projectId, reference: project.reference });

    try {
      await db.projectMilestone.createMany({
        data: DEFAULT_PROGRAMME_MILESTONES.map((m) => ({
          projectId: project.id,
          milestoneKey: m.key,
          milestoneName: m.name,
          sortOrder: m.sortOrder,
          createdById: userId,
          updatedById: userId
        })),
        skipDuplicates: true
      });
      console.info("[createProject] milestones initialised", { origin, userId, projectId });
    } catch (milestoneErr) {
      console.warn("[createProject] milestone init failed (non-fatal)", {
        origin,
        userId,
        projectId,
        err: milestoneErr
      });
    }
  } catch (err) {
    console.error("[createProject] create failed", { origin, userId, err });

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint violation (likely reference already exists).
        const existing = await db.project.findUnique({ where: { reference: parsed.data.reference } });
        if (existing) {
          console.warn("[createProject] reference already exists, redirecting to existing", {
            origin,
            userId,
            reference: parsed.data.reference,
            projectId: existing.id
          });
          redirect(`/projects/${existing.id}?exists=1`);
        }
        redirect(`${basePath}?error=reference_taken`);
      }
    }

    redirect(`${basePath}?error=create_failed`);
  }

  try {
    console.info("[createProject] revalidate paths", { origin, userId, projectId });
    revalidatePath("/dashboard");
    revalidatePath("/admin/projects");
  } catch (err) {
    console.warn("[createProject] revalidate failed", { origin, userId, projectId, err });
  }

  const destination = `/projects/${projectId}?created=1`;
  console.info("[createProject] redirect", { origin, userId, projectId, destination });
  redirect(destination);
}
