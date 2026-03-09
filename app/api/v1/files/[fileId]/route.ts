import { NextResponse } from "next/server";

import { requireApiPermission } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { readLocalFile } from "@/lib/storage/local";

type RouteContext = { params: { fileId: string } };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireApiPermission(PERMISSIONS.projectsRead);
  if (!auth.ok) return auth.response;

  const file = await db.storedFile.findUnique({ where: { id: ctx.params.fileId } });
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (file.storageProvider !== "local") {
    return NextResponse.json({ error: "unsupported_storage_provider" }, { status: 400 });
  }

  try {
    const { buffer } = await readLocalFile(file.storageKey);
    const body = new Uint8Array(buffer);
    return new Response(body, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename=\"${file.originalName.replace(/\"/g, "")}\"`
      }
    });
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }
}
