import type { AshAttachment } from "@ash/shared";
import type { Attachment } from "./runtime-events";

/**
 * Map praxis `Attachment` wire objects (snake_case) to the ash view-model
 * `AshAttachment`. Returns undefined for empty/absent so a message carries
 * `attachments` only when it actually has some (keeps history/live deep-equal).
 */
export function attachmentsToAsh(atts: Attachment[] | undefined): AshAttachment[] | undefined {
  if (!atts || atts.length === 0) return undefined;
  return atts.map((a) => ({
    id: a.id,
    name: a.name,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    uri: a.uri,
    kind: a.kind,
    source: a.source,
    ...(a.extracted_text ? { extractedText: a.extracted_text } : {}),
  }));
}
