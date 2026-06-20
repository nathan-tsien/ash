import type { AshContentBlock } from "@ash/shared";
import type { BlockDelta, ContentBlock } from "./runtime-events";

/**
 * Pure helpers shared by the live SSE reducer and the /history projection so the
 * praxis-block -> ash-block mapping and the streaming delta rules cannot drift
 * between the two code paths (AGENTS.md duplication discipline; ADR-0018).
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Concatenate the text of any text content blocks (used for tool_result detail). */
function textFromContent(content: ContentBlock[] | undefined): string {
  return (content ?? [])
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.data.text)
    .join("");
}

function toolResultDetail(
  data: Extract<ContentBlock, { type: "tool_result" }>["data"],
): string | undefined {
  if (!data.ok) return data.error_message || undefined;
  const text = textFromContent(data.content);
  return text.length > 0 ? text : undefined;
}

/**
 * Map a praxis ContentBlock to the ash view-model block. Image blocks are stubbed
 * to `{ kind: "image" }` (alt only) — rich image/citation rendering is deferred
 * (ADR-0018 open item). `args` defaults to `{}`; for a live tool_use it is filled
 * by finalizeToolArgs once the block's input_json_delta stream completes.
 */
export function praxisBlockToAsh(block: ContentBlock): AshContentBlock {
  switch (block.type) {
    case "text":
      return { kind: "text", text: block.data.text };
    case "thinking":
      return { kind: "thinking", text: block.data.text, redacted: block.data.redacted };
    case "tool_use":
      return {
        kind: "tool_use",
        callId: block.data.call_id,
        toolName: block.data.tool_name,
        args: isRecord(block.data.args) ? block.data.args : {},
      };
    case "tool_result":
      return {
        kind: "tool_result",
        callId: block.data.call_id,
        ok: block.data.ok,
        detail: toolResultDetail(block.data),
      };
    case "image":
      return { kind: "image" };
  }
}

/**
 * Apply a streamed BlockDelta to an ash block. text/thinking deltas append to the
 * block text. input_json_delta does NOT touch the block — tool args arrive as a
 * partial JSON string accumulated in `jsonAcc` and parsed by finalizeToolArgs on
 * content_block_stop (a half-streamed args object is not valid JSON mid-flight).
 * signature/citations deltas are carried but not surfaced in this slice.
 */
export function applyDelta(
  block: AshContentBlock,
  delta: BlockDelta,
  jsonAcc: string,
): { block: AshContentBlock; jsonAcc: string } {
  switch (delta.type) {
    case "text_delta":
      return block.kind === "text"
        ? { block: { ...block, text: block.text + delta.text }, jsonAcc }
        : { block, jsonAcc };
    case "thinking_delta":
      return block.kind === "thinking"
        ? { block: { ...block, text: block.text + delta.thinking }, jsonAcc }
        : { block, jsonAcc };
    case "input_json_delta":
      return { block, jsonAcc: jsonAcc + delta.partial_json };
    case "signature_delta":
    case "citations_delta":
      return { block, jsonAcc };
  }
}

/** Parse the accumulated tool-call args JSON; `{}` on empty or malformed input. */
export function finalizeToolArgs(jsonAcc: string): Record<string, unknown> {
  if (!jsonAcc) return {};
  try {
    const parsed: unknown = JSON.parse(jsonAcc);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
