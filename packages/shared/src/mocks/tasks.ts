import type { Task } from "../types";

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Remove watermark from image",
    description: "Remove the watermark from the uploaded product photo",
    status: "completed",
    createdAt: "2026-05-30T08:00:00Z",
    updatedAt: "2026-05-30T08:00:12Z",
    completedAt: "2026-05-30T08:00:12Z",
    messages: [
      {
        id: "msg-task-1-1",
        role: "user",
        blocks: [{ kind: "text", text: "Help me remove the watermark from this image" }],
        createdAt: "2026-05-30T08:00:00Z",
      },
      {
        id: "msg-task-1-2",
        role: "assistant",
        blocks: [{ kind: "text", text: "I've processed the image and removed the watermark. The result is ready for download." }],
        createdAt: "2026-05-30T08:00:12Z",
      },
    ],
    deliverables: [
      {
        id: "art-task-1-1",
        name: "product-clean.png",
        mimeType: "image/png",
        sizeBytes: 204800,
        uri: "/v1/tasks/task-1/attachments/art-task-1-1",
        kind: "image",
      },
    ],
    toolTraces: [
      {
        id: "trace-task-1-1",
        toolName: "Image Processing",
        summary: "Watermark removal completed",
        status: "success",
        startedAt: "2026-05-30T08:00:01Z",
        durationMs: 11000,
      },
    ],
  },
  {
    id: "task-2",
    title: "Generate PPT from report",
    description: "Create a presentation from the Q2 sales report",
    status: "running",
    createdAt: "2026-05-30T09:30:00Z",
    updatedAt: "2026-05-30T09:30:05Z",
    messages: [
      {
        id: "msg-task-2-1",
        role: "user",
        blocks: [{ kind: "text", text: "Generate a PPT from the attached Q2 sales report" }],
        createdAt: "2026-05-30T09:30:00Z",
      },
      {
        id: "msg-task-2-2",
        role: "assistant",
        blocks: [{ kind: "text", text: "Working on it. I'm analyzing the report structure and creating slides..." }],
        createdAt: "2026-05-30T09:30:05Z",
      },
    ],
    deliverables: [],
    toolTraces: [
      {
        id: "trace-task-2-1",
        toolName: "Document Analysis",
        summary: "Parsing Q2 report structure",
        status: "running",
        startedAt: "2026-05-30T09:30:02Z",
      },
    ],
  },
  {
    id: "task-3",
    title: "Translate document to English",
    description: "Translate the product manual from Chinese to English",
    status: "completed",
    createdAt: "2026-05-29T14:00:00Z",
    updatedAt: "2026-05-29T14:02:30Z",
    completedAt: "2026-05-29T14:02:30Z",
    messages: [
      {
        id: "msg-task-3-1",
        role: "user",
        blocks: [{ kind: "text", text: "Translate this product manual to English" }],
        createdAt: "2026-05-29T14:00:00Z",
      },
      {
        id: "msg-task-3-2",
        role: "assistant",
        blocks: [{ kind: "text", text: "Translation complete. The document has been translated with technical terminology preserved." }],
        createdAt: "2026-05-29T14:02:30Z",
      },
    ],
    deliverables: [
      {
        id: "art-task-3-1",
        name: "manual-en.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        uri: "/v1/tasks/task-3/attachments/art-task-3-1",
        kind: "file",
      },
    ],
    toolTraces: [
      {
        id: "trace-task-3-1",
        toolName: "Translation",
        summary: "Chinese to English translation",
        status: "success",
        startedAt: "2026-05-29T14:00:05Z",
        durationMs: 145000,
      },
    ],
  },
];

export function getMockTasks(): Task[] {
  return mockTasks;
}

export function getMockTask(id: string): Task | undefined {
  return mockTasks.find((t) => t.id === id);
}
