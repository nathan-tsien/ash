import type { Conversation } from "../types";

/** English copy for the same mock conversation IDs as zh. */
export const mockConversationsEn: Conversation[] = [
  {
    id: "conv-1",
    title: "Q2 roadmap research",
    preview: "Competitive feature comparison and three product directions ready…",
    updatedAt: "2026-05-23T10:42:00+08:00",
    unread: true,
    status: "running",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content:
          "Research 2026 AI Agent product trends, focusing on Manus, Cursor Agent, and Claude Code. Output a structured report outline.",
        createdAt: "2026-05-23T10:38:00+08:00",
      },
      {
        id: "msg-2",
        role: "assistant",
        content:
          "I'll start from public docs and announcements, summarize Agent UX patterns, then propose an outline and next writing steps.",
        createdAt: "2026-05-23T10:38:12+08:00",
      },
      {
        id: "msg-3",
        role: "assistant",
        content:
          "Initial retrieval is done; I'm comparing task orchestration, Plan panels, and workspace design. Next I'll draft the TOC and executive summary bullets.",
        createdAt: "2026-05-23T10:41:30+08:00",
        isStreaming: true,
      },
    ],
    plan: [
      { id: "p1", label: "Collect public docs and announcements", status: "done" },
      { id: "p2", label: "Compare Agent UX vs workspace modes", status: "running" },
      { id: "p3", label: "Draft outline and conclusion summary", status: "pending" },
      { id: "p4", label: "Curate sources and further reading", status: "pending" },
    ],
    toolTraces: [
      {
        id: "t1",
        toolName: "web_search",
        summary: "Search Manus Agent UX, Cursor Plan Mode",
        status: "success",
        startedAt: "2026-05-23T10:38:20+08:00",
        durationMs: 4200,
      },
      {
        id: "t2",
        toolName: "read_page",
        summary: "Fetch manus.im/docs and architecture notes",
        status: "success",
        startedAt: "2026-05-23T10:39:05+08:00",
        durationMs: 2800,
      },
      {
        id: "t3",
        toolName: "write_document",
        summary: "Draft report outline v0.1",
        status: "running",
        startedAt: "2026-05-23T10:41:45+08:00",
      },
    ],
    artifacts: [
      {
        id: "a1",
        kind: "document",
        title: "AI Agent trends · outline",
        preview: "1. Executive summary\n2. Agent UX patterns\n3. Workspace & Artifact design…",
        updatedAt: "2026-05-23T10:41:50+08:00",
      },
      {
        id: "a2",
        kind: "link",
        title: "Manus Documentation",
        preview: "https://manus.im/docs",
        updatedAt: "2026-05-23T10:39:10+08:00",
      },
    ],
  },
  {
    id: "conv-2",
    title: "Creator content planning",
    preview: "Five topic angles this week with titles and publishing rhythm",
    updatedAt: "2026-05-22T18:20:00+08:00",
    status: "completed",
    messages: [
      {
        id: "msg-4",
        role: "user",
        content: "Plan five AI-tool channel topics for this week.",
        createdAt: "2026-05-22T18:10:00+08:00",
      },
      {
        id: "msg-5",
        role: "assistant",
        content: "Drafted five topics with advice split across short video, posts, and long-form.",
        createdAt: "2026-05-22T18:18:00+08:00",
      },
    ],
    plan: [
      { id: "p1", label: "Review recent performance signals", status: "done" },
      { id: "p2", label: "Generate five topic angles", status: "done" },
      { id: "p3", label: "Output publishing rhythm", status: "done" },
    ],
    toolTraces: [
      {
        id: "t1",
        toolName: "analyze_metrics",
        summary: "Read last 30 days of content signals",
        status: "success",
        startedAt: "2026-05-22T18:11:00+08:00",
        durationMs: 1900,
      },
    ],
    artifacts: [
      {
        id: "a1",
        kind: "document",
        title: "This week's topics",
        preview: "1. An Agent is not a chatbot\n2. Deconstructing the three-pane shell…",
        updatedAt: "2026-05-22T18:17:00+08:00",
      },
    ],
  },
  {
    id: "conv-3",
    title: "Weekly report prep",
    preview: "Waiting for your Slack export…",
    updatedAt: "2026-05-21T09:05:00+08:00",
    status: "idle",
    messages: [
      {
        id: "msg-6",
        role: "assistant",
        content: "Upload a Slack export or paste channel summaries and I'll assemble a weekly report.",
        createdAt: "2026-05-21T09:05:00+08:00",
      },
    ],
    plan: [{ id: "p1", label: "Waiting for inputs", status: "pending" }],
    toolTraces: [],
    artifacts: [],
  },
  {
    id: "conv-4",
    title: "Vendor compliance screening",
    preview: "Compare new partner terms against the current compliance checklist…",
    updatedAt: "2026-05-20T16:30:00+08:00",
    status: "completed",
    messages: [
      {
        id: "msg-7",
        role: "user",
        content:
          "What gaps exist between Acme Cloud's contract terms and our compliance checklist? Provide risk levels and remediation advice.",
        createdAt: "2026-05-20T16:05:00+08:00",
      },
      {
        id: "msg-8",
        role: "assistant",
        content:
          "Clause-by-clause comparison complete — three high-risk gaps found (data residency, audit rights, sub-processor disclosure). A diff summary document is ready.",
        createdAt: "2026-05-20T16:28:00+08:00",
      },
    ],
    plan: [
      { id: "p1", label: "Extract key contract clauses", status: "done" },
      { id: "p2", label: "Compare against compliance checklist", status: "done" },
      { id: "p3", label: "Output risk levels and remediation", status: "done" },
    ],
    toolTraces: [
      {
        id: "t1",
        toolName: "clause_diff",
        summary: "Diff Acme Cloud sections 4–7 against internal compliance list",
        status: "success",
        startedAt: "2026-05-20T16:08:00+08:00",
        durationMs: 5200,
      },
      {
        id: "t2",
        toolName: "policy_compare",
        summary: "Match GDPR / data residency / sub-processor disclosure rules",
        status: "success",
        startedAt: "2026-05-20T16:15:00+08:00",
        durationMs: 3800,
      },
    ],
    artifacts: [
      {
        id: "a1",
        kind: "document",
        title: "Compliance diff summary",
        preview: "High risk ×3: missing data residency · limited audit rights · undisclosed sub-processors…",
        updatedAt: "2026-05-20T16:27:00+08:00",
      },
    ],
  },
];
