/**
 * Triggers a browser file download for the given string content.
 *
 * Creates a temporary `<a>` element, clicks it, and immediately cleans up
 * both the element and the object URL to avoid memory leaks.
 *
 * **Browser only** — do not call this in a server or Node.js context.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
