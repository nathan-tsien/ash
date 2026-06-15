import type { ToolTrace } from "@ash/shared";

/**
 * Shared tool-trace helpers used by both the live runtime reducer and the
 * /history catch-up projection. Hoisted here so the serialization + reconcile
 * rules cannot drift between the two code paths (AGENTS.md duplication discipline).
 */

/**
 * Render a tool call's argument object into a compact single-line summary for
 * the workspace tools card. Caps length so wide payloads don't blow out the row.
 */
export function summarizeArgs(args: unknown): string {
  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0) {
      return keys
        .map((k) => `${k}: ${String(record[k])}`)
        .join(", ")
        .slice(0, 120);
    }
  }
  return "";
}

/**
 * Serialize a tool input/output payload for the expandable trace detail. Objects
 * pretty-print as JSON; strings pass through; everything else uses String().
 * Returns undefined for empty/absent payloads so the disclosure renders only when
 * detail actually exists.
 */
export function serializeDetail(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.length > 0 ? value : undefined;
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value, null, 2);
      return json && json !== "{}" && json !== "[]" ? json : undefined;
    } catch {
      return undefined;
    }
  }
  return String(value);
}

/**
 * Insert a new tool trace, or replace an existing one with the same call id.
 * On /history re-attach the seed already carries traces produced by the prior
 * live stream; appending blindly would duplicate tool rows for the same call_id
 * in the timeline. Reconcile-by-id keeps each tool call a single row, mirroring
 * the clientId dedupe used for user messages.
 */
export function upsertToolTrace(traces: ToolTrace[], next: ToolTrace): ToolTrace[] {
  const i = traces.findIndex((t) => t.id === next.id);
  if (i === -1) return [...traces, next];
  const copy = [...traces];
  copy[i] = next;
  return copy;
}
