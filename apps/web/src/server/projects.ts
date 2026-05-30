import "server-only";

import type { AshLocale, Project } from "@ash/shared";

export async function listProjects(
  _locale: AshLocale,
): Promise<Project[]> {
  return [];
}

export async function getActiveProject(
  _projectId: string,
  _locale: AshLocale,
): Promise<Project | undefined> {
  return undefined;
}
