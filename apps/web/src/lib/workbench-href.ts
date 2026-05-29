import type { Task, Project } from "@ash/shared";

/** Resolve the default workbench entry href. */
export function firstWorkbenchHref(tasks: Task[], projects: Project[]): string {
  if (tasks.length > 0) return `/app/task/${tasks[0].id}`;
  if (projects.length > 0) return `/app/project/${projects[0].id}`;
  return "/app";
}

export function taskHref(taskId: string): string {
  return `/app/task/${taskId}`;
}

export function projectHref(projectId: string): string {
  return `/app/project/${projectId}`;
}
