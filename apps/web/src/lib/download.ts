/** Triggers a browser download for `blob` under `fileName`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, fileName: string, type = "application/json"): void {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), fileName);
}
