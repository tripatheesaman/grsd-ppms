import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOAD_ROOT } from "@/lib/config/app-config";

export async function ensureUploadDir(subdir: string) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUpload(
  subdir: string,
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${randomUUID()}${ext}`;
  const dir = await ensureUploadDir(subdir);
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buffer);
  return path.join(subdir, filename).replace(/\\/g, "/");
}

export function getUploadAbsolute(relativePath: string): string {
  return path.join(UPLOAD_ROOT, relativePath);
}
