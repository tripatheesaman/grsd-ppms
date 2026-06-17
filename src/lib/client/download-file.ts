/** Open a generated file URL (same tab / download, avoids popup blockers vs window.open). */
export function openDownloadUrl(url: string, filename?: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (filename) {
    anchor.download = filename;
  } else {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
