export type MessageRole = "user" | "assistant" | "system";

/**
 * ash view-model content block — mirrors praxis 0.3.0 `ContentBlock` but decoupled
 * from the generated wire types so UI/packages never import `generated.ts`
 * (ADR-0018). The projection layer maps praxis blocks to these.
 */
export type AshContentBlock =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string; redacted?: boolean }
  | { kind: "tool_use"; callId: string; toolName: string; args: Record<string, unknown> }
  | { kind: "tool_result"; callId: string; ok: boolean; detail?: string }
  | { kind: "image"; alt?: string };

export interface Message {
  id: string;
  role: MessageRole;
  /** Typed content blocks making up the message body (praxis 0.3.0 block model). */
  blocks: AshContentBlock[];
  createdAt: string;
  isStreaming?: boolean;
  /** Reason the model stopped, when the message is complete (praxis StopReason). */
  stopReason?: string;
  /**
   * Stable client-side correlation key for an optimistically-rendered message.
   * Set on the locally-seeded user bubble at send time so the history projection
   * can reconcile that same bubble in place (keeping its React key) instead of
   * appending a duplicate when the persisted turn is folded back in.
   */
  clientId?: string;
  /** Agent/user file attachments on this message envelope (praxis Attachment). */
  attachments?: AshAttachment[];
}

/** Concatenate the text of a message's text blocks (ignores thinking/tool/image). */
export function textOf(message: Message): string {
  return message.blocks
    .filter((b): b is Extract<AshContentBlock, { kind: "text" }> => b.kind === "text")
    .map((b) => b.text)
    .join("");
}

export type AttachmentKind = "file" | "image";
export type AttachmentSource = "user_upload" | "agent_generated";

/** A file/image attached to a message (mirrors praxis Attachment, decoupled from wire types). */
export interface AshAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
  kind: AttachmentKind;
  source: AttachmentSource;
  extractedText?: string;
}

/** An agent-produced task output, projected from an agent_generated AshAttachment. */
export interface Deliverable {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string;
  kind: AttachmentKind;
}

export type ProcessEventKind = "tool" | "ask" | "done";
export type ProcessEventStatus = "running" | "success" | "error" | "info";

/** A normalized, navigable timeline entry derived from message blocks (no new contract). */
export interface ProcessEvent {
  id: string;
  kind: ProcessEventKind;
  label: string;
  status: ProcessEventStatus;
  at: string;
  /** Originating message id, for jump-to-turn. */
  messageId?: string;
}

export type ConversationStatus = "idle" | "pending" | "running" | "awaiting_input" | "completed" | "failed";

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unread?: boolean;
  status: ConversationStatus;
  messages: Message[];
  plan: PlanStep[];
  toolTraces: ToolTrace[];
  artifacts: Artifact[];
}

export type PlanStepStatus = "pending" | "running" | "done" | "failed";

export interface PlanStep {
  id: string;
  label: string;
  status: PlanStepStatus;
}

export type ToolTraceStatus = "running" | "success" | "error";

export interface ToolTrace {
  id: string;
  toolName: string;
  summary: string;
  status: ToolTraceStatus;
  startedAt: string;
  durationMs?: number;
  /** Serialized tool input (args), revealed in the expandable trace detail. */
  input?: string;
  /** Serialized tool result/output, revealed in the expandable trace detail. */
  result?: string;
}

export type ArtifactKind = "document" | "code" | "image" | "link";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  preview: string;
  updatedAt: string;
}

export type TaskStatus =
  | "pending"
  | "running"
  | "awaiting_input"
  | "completed"
  | "failed";

/** A question the agent is waiting on (praxis `ask_user`). */
export interface PendingQuestion {
  /** Live correlation id; required to POST an answer. Empty when recovered
   *  from history before the live stream re-emits it (read-only). */
  askId: string;
  /** Question text shown to the user. */
  text: string;
  /** Workspace-relative attachment refs; [] when none. */
  attachments: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  projectId?: string; // undefined for independent tasks
  messages: Message[];
  deliverables: Deliverable[];
  toolTraces: ToolTrace[];
  /** Present iff status === "awaiting_input". */
  pendingQuestion?: PendingQuestion;
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export interface ProjectMaterial {
  id: string;
  name: string;
  kind: "file" | "connector";
  size?: string;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  materials: ProjectMaterial[];
  tasks: Task[];
  artifacts: Artifact[];
  connectors: Connector[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarFallback: string;
}

export type FeatureId = "core" | "office" | "media";

export interface FeatureDefinition {
  id: FeatureId;
  label: string;
  description: string;
  enabled: boolean;
}

export type ScheduledTaskStatus = "enabled" | "paused" | "errored";

export interface ScheduledTask {
  id: string;
  label: string;
  cron: string;
  nextRunAt: string; // ISO 8601
  status: ScheduledTaskStatus;
  description: string;
}

export type ConnectorKind = "notes" | "mcp" | "file" | "calendar";
export type ConnectorStatus = "connected" | "disconnected" | "error";

export interface Connector {
  id: string;
  label: string;
  provider: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  description: string;
  updatedAt: string; // ISO 8601
}
