import type { Artifact, AshContentBlock, Message, Task } from "@ash/shared";
import type { StreamEvent } from "./runtime-events";
import { applyDelta, finalizeToolArgs, pendingQuestionFromMessages, praxisBlockToAsh } from "./block-fold";
import { tracesFromBlocks } from "./tool-trace";

/**
 * Folds the praxis 0.3.0 `StreamEvent` block stream into ash's `Task` view-model
 * (ADR-0018). The turn lifecycle is `message_start` -> (`content_block_start` /
 * `content_block_delta` / `content_block_stop`)* -> `message_delta` ->
 * `message_stop`, interleaved with control events (`turn_paused`, `turn_resumed`,
 * `stream_end`, `ping`, `skill_activation_requested`).
 *
 * Pure and deterministic: timestamps come from the injected `nowMs`, ids from a
 * monotonic `seq` (for synthetic notices) — no `Date.now()`/`Math.random()` here.
 *
 * Tool traces are DERIVED from message blocks (`tracesFromBlocks`) rather than
 * maintained incrementally, so a `tool_result` block resolves its `tool_use`
 * regardless of which message carries it. App-authored copy is injected via
 * `ReducerLabels` to keep the reducer i18n-clean (IMPL-3).
 */
export interface TaskRunState {
  task: Task;
  /** Id of the in-flight (streaming) message, or null between turns. */
  currentMessageId: string | null;
  /** Per content-block-index accumulator for input_json_delta (tool args). */
  blockJsonAcc: Record<number, string>;
  /** Monotonic counter for synthetic notice message ids. */
  seq: number;
}

/** User-facing strings the reducer renders, resolved by the caller from i18n. */
export interface ReducerLabels {
  /** Fallback deck title when the task has none (artifact filename base). */
  deckFallbackTitle: string;
  /** Placeholder preview text for the synthesized deck artifact. */
  deckPreview: string;
  /** Builds the user-facing failure notice from the praxis reason. */
  failureNotice: (reason: string) => string;
  /** Notice appended when a turn stopped with stop_reason "max_tokens". */
  truncationNotice: string;
  /** Shown as the question text when a message_ask_user block carries none. */
  askFallbackText: string;
}

export function initialTaskRunState(task: Task): TaskRunState {
  return { task, currentMessageId: null, blockJsonAcc: {}, seq: 0 };
}

const iso = (ms: number): string => new Date(ms).toISOString();

// TODO(ash): replace the synthesized placeholder deck with praxis task_outputs
// when that contract ships. praxis emits no artifact event, so ash synthesizes a
// placeholder on terminal completion.
function synthesizePptArtifact(task: Task, nowMs: number, labels: ReducerLabels): Artifact {
  const base = (task.title || labels.deckFallbackTitle).replace(/\.pptx$/i, "");
  return {
    id: `artifact-${task.id}-deck`,
    kind: "document",
    title: `${base}.pptx`,
    preview: labels.deckPreview,
    updatedAt: iso(nowMs),
  };
}

export function runtimeEventReducer(
  state: TaskRunState,
  event: StreamEvent,
  nowMs: number,
  labels: ReducerLabels,
): TaskRunState {
  const task = state.task;
  switch (event.type) {
    case "message_start": {
      const pm = event.message;
      const msg: Message = {
        id: pm.id,
        role: pm.role === "user" ? "user" : "assistant",
        blocks: (pm.content ?? []).map(praxisBlockToAsh),
        createdAt: pm.created_at,
        isStreaming: true,
        stopReason: pm.stop_reason,
      };
      // Upsert by id: praxis may re-emit in-flight state on (re)subscribe, so a
      // repeated message_start for the same id must replace, not append a
      // duplicate-keyed bubble.
      const existingIdx = task.messages.findIndex((m) => m.id === pm.id);
      const messages =
        existingIdx === -1
          ? [...task.messages, msg]
          : task.messages.map((m, i) => (i === existingIdx ? msg : m));
      return {
        ...state,
        currentMessageId: pm.id,
        blockJsonAcc: {},
        task: withMessages(task, messages, nowMs),
      };
    }

    case "content_block_start": {
      const ash = praxisBlockToAsh(event.content_block);
      const messages = mapCurrent(task.messages, state.currentMessageId, (m) => ({
        ...m,
        blocks: setBlock(m.blocks, event.index, ash),
      }));
      return {
        ...state,
        blockJsonAcc: { ...state.blockJsonAcc, [event.index]: "" },
        task: withMessages(task, messages, nowMs),
      };
    }

    case "content_block_delta": {
      let nextAcc = state.blockJsonAcc[event.index] ?? "";
      const messages = mapCurrent(task.messages, state.currentMessageId, (m) => {
        const block = m.blocks[event.index];
        if (!block) return m;
        const res = applyDelta(block, event.delta, nextAcc);
        nextAcc = res.jsonAcc;
        return { ...m, blocks: setBlock(m.blocks, event.index, res.block) };
      });
      return {
        ...state,
        blockJsonAcc: { ...state.blockJsonAcc, [event.index]: nextAcc },
        // Deltas append text/thinking or accumulate tool-arg JSON — none change
        // the tool trace set, so skip re-derivation on every token (perf).
        task: setMessages(task, messages, nowMs),
      };
    }

    case "content_block_stop": {
      // Finalize streamed tool args ONLY when input_json_delta accumulated
      // something. An empty accumulator means the block already carried complete
      // args in content_block_start (re-emit / history catch-up) — overwriting
      // with {} would wipe them.
      const acc = state.blockJsonAcc[event.index];
      if (!acc) return state;
      const messages = mapCurrent(task.messages, state.currentMessageId, (m) => {
        const block = m.blocks[event.index];
        if (!block || block.kind !== "tool_use") return m;
        return { ...m, blocks: setBlock(m.blocks, event.index, { ...block, args: finalizeToolArgs(acc) }) };
      });
      return { ...state, task: withMessages(task, messages, nowMs) };
    }

    case "message_delta": {
      const messages = mapCurrent(task.messages, state.currentMessageId, (m) => ({
        ...m,
        stopReason: event.stop_reason ?? m.stopReason,
      }));
      return { ...state, task: setMessages(task, messages, nowMs) };
    }

    case "message_stop": {
      const stop = currentStopReason(task.messages, state.currentMessageId);
      let messages = mapCurrent(task.messages, state.currentMessageId, (m) => ({ ...m, isStreaming: false }));
      let seq = state.seq;
      if (stop === "max_tokens") {
        messages = [...messages, noticeMessage(task.id, `trunc-${seq}`, labels.truncationNotice, nowMs)];
        seq += 1;
      }
      return {
        ...state,
        currentMessageId: null,
        blockJsonAcc: {},
        seq,
        // Clearing isStreaming / appending a truncation notice changes no tool
        // trace — keep the derived traces as-is.
        task: setMessages(task, messages, nowMs),
      };
    }

    case "turn_paused": {
      const pending = pendingQuestionFromMessages(task.messages, labels.askFallbackText);
      return {
        ...state,
        task: {
          ...task,
          status: "awaiting_input",
          ...(pending ? { pendingQuestion: pending } : {}),
          updatedAt: iso(nowMs),
        },
      };
    }

    case "turn_resumed": {
      const { pendingQuestion: _cleared, ...rest } = task;
      return { ...state, task: { ...rest, status: "running", updatedAt: iso(nowMs) } };
    }

    case "stream_end": {
      if (event.task_status === "completed") {
        return {
          ...state,
          currentMessageId: null,
          task: {
            ...task,
            artifacts: upsertArtifact(task.artifacts, synthesizePptArtifact(task, nowMs, labels)),
            status: "completed",
            completedAt: iso(nowMs),
            updatedAt: iso(nowMs),
          },
        };
      }
      if (event.task_status === "failed" || event.task_status === "cancelled") {
        const messages = [...task.messages, noticeMessage(task.id, `fail-${state.seq}`, labels.failureNotice(event.task_status), nowMs)];
        return {
          ...state,
          seq: state.seq + 1,
          currentMessageId: null,
          task: { ...setMessages(task, messages, nowMs), status: "failed" },
        };
      }
      return state; // non-terminal (e.g. awaiting_input): leave as-is
    }

    case "ping":
    case "skill_activation_requested":
      // Keep-alive / advisory skill signal — not surfaced this slice.
      return state;

    default:
      return state;
  }
}

/** Rebuild the task with new messages + freshly derived tool traces. */
/**
 * Set messages + bump updatedAt, AND re-derive tool traces. Use only on events
 * that can change the block set's tool_use/tool_result shape (block start/stop,
 * message_start whose seed content may carry tool blocks).
 */
function withMessages(task: Task, messages: Message[], nowMs: number): Task {
  return { ...task, messages, toolTraces: tracesFromBlocks(messages), updatedAt: iso(nowMs) };
}

/**
 * Set messages + bump updatedAt, KEEPING the existing tool traces. Use on events
 * that cannot change tool traces (text/thinking deltas, input_json accumulation,
 * stopReason, isStreaming clear, appended notices) so the O(messages×blocks)
 * trace derivation does not run on every streamed token.
 */
function setMessages(task: Task, messages: Message[], nowMs: number): Task {
  return { ...task, messages, updatedAt: iso(nowMs) };
}

function mapCurrent(messages: Message[], id: string | null, fn: (m: Message) => Message): Message[] {
  if (!id) return messages;
  return messages.map((m) => (m.id === id ? fn(m) : m));
}

/** Set the block at `index`, padding with empty text blocks if the stream skips. */
function setBlock(blocks: AshContentBlock[], index: number, block: AshContentBlock): AshContentBlock[] {
  const copy = blocks.slice();
  while (copy.length < index) copy.push({ kind: "text", text: "" });
  copy[index] = block;
  return copy;
}

function currentStopReason(messages: Message[], id: string | null): string | undefined {
  return id ? messages.find((m) => m.id === id)?.stopReason : undefined;
}

function noticeMessage(taskId: string, suffix: string, text: string, nowMs: number): Message {
  return {
    id: `assistant-${taskId}-${suffix}`,
    role: "assistant",
    blocks: [{ kind: "text", text }],
    createdAt: iso(nowMs),
  };
}

/** Replace an artifact with the same id, else append. Keeps deck ids unique. */
function upsertArtifact(artifacts: Artifact[], next: Artifact): Artifact[] {
  const i = artifacts.findIndex((a) => a.id === next.id);
  if (i === -1) return [...artifacts, next];
  const copy = [...artifacts];
  copy[i] = next;
  return copy;
}
