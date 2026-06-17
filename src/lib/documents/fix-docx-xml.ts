import type PizZip from "pizzip";

const DOCX_XML_PATHS = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;

const RUN_BREAK =
  /<\/w:t>\s*<\/w:r>\s*(?:<w:r[^>]*>(?:<w:rPr[^>]*\/>|<w:rPr>[\s\S]*?<\/w:rPr>)?\s*)?<w:t(?:\s[^>]*)?>/g;

export function mergeSplitPlaceholderRuns(xml: string): string {
  let prev = "";
  let current = xml;
  while (prev !== current) {
    prev = current;
    current = current.replace(RUN_BREAK, "");
  }
  return current;
}

export function fixDocxPlaceholderXml(zip: PizZip): void {
  for (const fileName of Object.keys(zip.files)) {
    if (!DOCX_XML_PATHS.test(fileName)) continue;
    const file = zip.files[fileName];
    if (!file || file.dir) continue;
    const xml = file.asText();
    const fixed = mergeSplitPlaceholderRuns(xml);
    if (fixed !== xml) {
      zip.file(fileName, fixed);
    }
  }
}
