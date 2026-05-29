import "server-only";

import {
  getMockProject,
  getMockProjects,
  type AshLocale,
  type Project,
} from "@ash/shared";

/** Phase 1: backed by deterministic mocks; Phase 2 swaps internals to ash-server. */
export async function listProjects(
  _locale: AshLocale,
): Promise<Project[]> {
  return getMockProjects();
}

export async function getActiveProject(
  projectId: string,
  _locale: AshLocale,
): Promise<Project | undefined> {
  return getMockProject(projectId);
}
