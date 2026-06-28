export type ViewerKind = "image" | "pdf" | "markdown" | "code" | "text" | "none";

const CODE_EXT = new Set(["json", "ts", "tsx", "js", "jsx", "py", "css", "html", "yaml", "yml", "sh", "sql"]);
const MARKDOWN_EXT = new Set(["md", "markdown"]);

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Pick an in-app viewer for a deliverable by MIME, falling back to file extension. */
export function pickDeliverableViewer(mimeType: string, name: string): ViewerKind {
  const mime = mimeType.toLowerCase();
  const e = ext(name);
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || e === "pdf") return "pdf";
  if (mime === "text/markdown" || MARKDOWN_EXT.has(e)) return "markdown";
  if (mime === "application/json" || CODE_EXT.has(e)) return "code";
  if (mime.startsWith("text/")) return "text";
  return "none";
}
