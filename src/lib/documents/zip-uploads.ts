import { createWriteStream } from "fs";
import { finished } from "stream/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ZipArchive } from "archiver";

import { ensureUploadDir, getUploadAbsolute } from "@/lib/uploads";

export type ZipEntry = {
  filePath: string;
  archiveName: string;
};

export async function zipUploadFiles(entries: ZipEntry[]): Promise<string> {
  if (entries.length === 0) {
    throw new Error("zipUploadFiles requires at least one entry");
  }

  const subdir = path.join("generated", new Date().getFullYear().toString());
  await ensureUploadDir(subdir);

  const zipName = `${randomUUID()}.zip`;
  const relativePath = path.join(subdir, zipName).replace(/\\/g, "/");
  const absolutePath = getUploadAbsolute(relativePath);

  const output = createWriteStream(absolutePath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  const archiveDone = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", reject);
    output.on("error", reject);
  });

  archive.pipe(output);

  for (const entry of entries) {
    archive.file(getUploadAbsolute(entry.filePath), { name: entry.archiveName });
  }

  await archive.finalize();
  await archiveDone;
  await finished(output);

  return relativePath;
}

export function safeArchiveName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().slice(0, 120) || "letter";
}
