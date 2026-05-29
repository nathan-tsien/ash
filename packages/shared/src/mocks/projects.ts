import type { Project } from "../types";

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Self-media Vlog Project",
    description: "Create a vlog about self-media entrepreneurship",
    status: "active",
    createdAt: "2026-05-28T10:00:00Z",
    updatedAt: "2026-05-30T09:00:00Z",
    materials: [
      {
        id: "mat-1",
        name: "Competitor Analysis.pdf",
        kind: "file",
        size: "2.4 MB",
        addedAt: "2026-05-28T10:05:00Z",
      },
      {
        id: "mat-2",
        name: "Reference Videos.mp4",
        kind: "file",
        size: "156 MB",
        addedAt: "2026-05-28T10:10:00Z",
      },
      {
        id: "mat-3",
        name: "Industry Data.xlsx",
        kind: "file",
        size: "890 KB",
        addedAt: "2026-05-28T10:15:00Z",
      },
    ],
    tasks: [
      {
        id: "proj1-task-1",
        title: "Collect industry materials",
        description: "Gather data about self-media industry trends",
        status: "completed",
        createdAt: "2026-05-28T11:00:00Z",
        updatedAt: "2026-05-28T11:30:00Z",
        completedAt: "2026-05-28T11:30:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [
          {
            id: "art-proj1-1",
            kind: "document",
            title: "Industry Report",
            preview: "industry-report.pdf",
            updatedAt: "2026-05-28T11:30:00Z",
          },
        ],
        toolTraces: [],
      },
      {
        id: "proj1-task-2",
        title: "Analyze popular topics",
        description: "Identify trending topics in self-media space",
        status: "running",
        createdAt: "2026-05-29T09:00:00Z",
        updatedAt: "2026-05-30T09:00:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
      {
        id: "proj1-task-3",
        title: "Write vlog script",
        description: "Draft the vlog script based on research",
        status: "pending",
        createdAt: "2026-05-30T09:00:00Z",
        updatedAt: "2026-05-30T09:00:00Z",
        projectId: "proj-1",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
    ],
    artifacts: [
      {
        id: "art-proj1-1",
        kind: "document",
        title: "Industry Report",
        preview: "industry-report.pdf",
        updatedAt: "2026-05-28T11:30:00Z",
      },
    ],
    connectors: [],
  },
  {
    id: "proj-2",
    name: "Q2 Report",
    description: "Prepare quarterly business review presentation",
    status: "active",
    createdAt: "2026-05-27T08:00:00Z",
    updatedAt: "2026-05-30T07:00:00Z",
    materials: [
      {
        id: "mat-4",
        name: "Q2 Sales Data.xlsx",
        kind: "file",
        size: "1.2 MB",
        addedAt: "2026-05-27T08:10:00Z",
      },
      {
        id: "mat-5",
        name: "Team Notes (Notion)",
        kind: "connector",
        addedAt: "2026-05-27T08:15:00Z",
      },
    ],
    tasks: [
      {
        id: "proj2-task-1",
        title: "Compile sales metrics",
        description: "Extract and summarize Q2 sales data",
        status: "completed",
        createdAt: "2026-05-27T09:00:00Z",
        updatedAt: "2026-05-27T09:45:00Z",
        completedAt: "2026-05-27T09:45:00Z",
        projectId: "proj-2",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
      {
        id: "proj2-task-2",
        title: "Generate presentation",
        description: "Create QBR slide deck from compiled data",
        status: "pending",
        createdAt: "2026-05-30T07:00:00Z",
        updatedAt: "2026-05-30T07:00:00Z",
        projectId: "proj-2",
        messages: [],
        artifacts: [],
        toolTraces: [],
      },
    ],
    artifacts: [],
    connectors: [
      {
        id: "conn-1",
        label: "Team Notes",
        provider: "Notion",
        kind: "notes",
        status: "connected",
        description: "Synced from Notion workspace",
        updatedAt: "2026-05-27T08:15:00Z",
      },
    ],
  },
];

export function getMockProjects(): Project[] {
  return mockProjects;
}

export function getMockProject(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}
