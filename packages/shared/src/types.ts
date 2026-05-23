export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
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
}

export type ArtifactKind = "document" | "code" | "image" | "link";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  preview: string;
  updatedAt: string;
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
