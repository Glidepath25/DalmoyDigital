import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

export type LocalStoredFileResult = {
  storageProvider: "local";
  storageKey: string;
  absolutePath: string;
  sizeBytes: number;
};

function safeFilename(name: string) {
  const trimmed = name.trim() || "file";
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

export function getUploadDir() {
  return process.env.UPLOAD_DIR?.trim()
    ? path.resolve(process.env.UPLOAD_DIR.trim())
    : path.join(process.cwd(), "uploads");
}

export function resolveLocalStorageKey(storageKey: string) {
  const base = getUploadDir();
  const full = path.resolve(base, storageKey);
  if (!full.startsWith(path.resolve(base))) {
    throw new Error("invalid_storage_key");
  }
  return full;
}

export async function storeLocalBuffer(params: {
  originalName: string;
  buffer: Buffer;
  prefix?: string;
}): Promise<LocalStoredFileResult> {
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const keyPrefix = params.prefix?.trim() ? `${params.prefix.trim().replace(/\/+$/g, "")}/` : "";
  const filename = safeFilename(params.originalName);
  const storageKey = `${keyPrefix}${randomUUID()}_${filename}`;
  const absolutePath = resolveLocalStorageKey(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, params.buffer);

  return {
    storageProvider: "local",
    storageKey,
    absolutePath,
    sizeBytes: params.buffer.length
  };
}

export async function readLocalFile(storageKey: string) {
  const absolutePath = resolveLocalStorageKey(storageKey);
  const buffer = await readFile(absolutePath);
  const info = await stat(absolutePath);
  return { absolutePath, buffer, sizeBytes: info.size };
}

