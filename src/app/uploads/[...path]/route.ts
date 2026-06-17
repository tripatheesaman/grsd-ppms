import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadAbsolute } from "@/lib/uploads";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { path: segments } = await context.params;
  const relative = segments.join("/");
  if (relative.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const absolute = getUploadAbsolute(relative);
    const buffer = await readFile(absolute);
    const ext = path.extname(relative).toLowerCase();
    const contentType =
      ext === ".docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : ext === ".xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : ext === ".zip"
            ? "application/zip"
            : "application/octet-stream";
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (ext === ".zip") {
      const basename = path.basename(relative);
      headers["Content-Disposition"] = `attachment; filename="${basename}"`;
    }
    return new NextResponse(buffer, { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
