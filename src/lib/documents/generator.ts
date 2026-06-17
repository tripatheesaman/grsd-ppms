import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ApiError } from "@/lib/api/errors";
import { fixDocxPlaceholderXml } from "@/lib/documents/fix-docx-xml";
import { buildPlaceholderMap, type ProcurementDocData } from "@/lib/documents/placeholders";
import type { AppSettings } from "@/lib/settings";
import { getUploadAbsolute, saveUpload } from "@/lib/uploads";

export const DOCX_PLACEHOLDER_DELIMITERS = { start: "{{", end: "}}" } as const;

type TemplateErrorItem = {
  properties?: {
    explanation?: string;
    context?: string;
    id?: string;
  };
};

function formatDocxTemplateError(error: unknown): string {
  const err = error as {
    properties?: { errors?: TemplateErrorItem[]; explanation?: string };
    message?: string;
  };

  const parts: string[] = [];
  const errors = err.properties?.errors;
  if (errors?.length) {
    const seen = new Set<string>();
    for (const item of errors) {
      const line = item.properties?.explanation ?? item.properties?.id;
      if (line && !seen.has(line)) {
        seen.add(line);
        parts.push(line);
      }
    }
  }

  if (parts.length === 0) {
    return (
      err.properties?.explanation ??
      err.message ??
      "Document template is invalid. Use {{placeholder}} tokens typed in one piece (see placeholder guide)."
    );
  }

  const unique = parts.slice(0, 5);
  const suffix =
    parts.length > 5
      ? ` (+${parts.length - 5} more). Tip: re-type each {{token}} in Word without pausing mid-tag.`
      : ". Tip: type each {{token}} in one go in Word, or paste from the placeholder guide.";

  return `Template error: ${unique.join("; ")}${suffix}`;
}

export async function generateDocxFromTemplate(
  templatePath: string,
  data: ProcurementDocData,
  settings: AppSettings,
  extra?: Record<string, string>,
): Promise<string> {
  const absolute = getUploadAbsolute(templatePath);
  const content = await readFile(absolute);
  const zip = new PizZip(content);
  fixDocxPlaceholderXml(zip);

  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, {
      delimiters: DOCX_PLACEHOLDER_DELIMITERS,
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
  } catch (error) {
    throw new ApiError(400, "TEMPLATE_ERROR", formatDocxTemplateError(error));
  }

  const map = buildPlaceholderMap(data, settings, extra);
  try {
    doc.render(map);
  } catch (error) {
    throw new ApiError(400, "TEMPLATE_ERROR", formatDocxTemplateError(error));
  }

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  const filename = `${randomUUID()}.docx`;
  const subdir = path.join("generated", new Date().getFullYear().toString());
  const relative = await saveUpload(subdir, Buffer.from(buffer), filename);
  return relative;
}

export async function writeGuideDocx(outputPath: string, catalog: Array<{ token: string; label: string }>) {
  const lines = catalog.map((c) => `${c.token} — ${c.label}`).join("\n");
  const minimal = `PPMS Placeholder Guide\n\n${lines}`;
  await writeFile(outputPath, minimal, "utf-8");
}
