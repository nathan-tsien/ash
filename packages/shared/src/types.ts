export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  /**
   * Stable client-side correlation key for an optimistically-rendered message.
   * Set on the locally-seeded user bubble at send time so the history projection
   * can reconcile that same bubble in place (keeping its React key) instead of
   * appending a duplicate when the persisted turn is folded back in.
   */
  clientId?: string;
}

export type ConversationStatus = "idle" | "running" | "completed" | "failed";

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
  artifacts: Artifact[];
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
