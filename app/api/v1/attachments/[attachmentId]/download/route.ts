import { NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { readLocalFile } from "@/lib/storage/local";

type RouteContext = { params: { attachmentId: string } };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const attachment = await db.projectAttachment.findUnique({
    where: { id: ctx.params.attachmentId },
    include: { file: true }
  });
  if (!attachment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stored = attachment.file;
  if (stored.storageProvider !== "local") {
    return NextResponse.json({ error: "unsupported_storage_provider" }, { status: 400 });
  }

  try {
    const { buffer } = await readLocalFile(stored.storageKey);
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return new Response(body, {
      headers: {
        "Content-Type": stored.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename=\"${stored.originalName.replace(/\"/g, "")}\"`
      }
    });
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }
}
