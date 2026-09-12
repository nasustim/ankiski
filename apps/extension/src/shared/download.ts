/**
 * Triggers a browser download of a text payload. Extension pages are allowed to do
 * this without the `downloads` permission, so an object URL plus a synthetic click
 * is all that is needed.
 */
export function downloadTextFile(
  text: string,
  fileName: string,
  mimeType = "application/json",
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
