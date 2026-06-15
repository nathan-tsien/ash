"use client";

import { useEffect, useState } from "react";
import { getPraxisClient } from "./client";
import type { SkillSummary } from "./runtime-events";

/**
 * Session-scoped cache of the skill catalog. The in-flight promise is memoized
 * at module scope so navigating between the home composer and settings does not
 * refetch GET /v1/skills within a session. GET /v1/skills is documented
 * single-page; we fetch one page and do not loop on next_cursor.
 */
let cache: Promise<SkillSummary[]> | null = null;

function loadSkills(): Promise<SkillSummary[]> {
  if (!cache) {
    cache = getPraxisClient()
      .listSkills()
      .then((page) => page.items);
  }
  return cache;
}

/** Test-only: drop the module cache between cases. */
export function __resetSkillCatalogCache(): void {
  cache = null;
}

export interface SkillCatalogState {
  skills: SkillSummary[];
  loading: boolean;
  error: boolean;
}

export function useSkillCatalog(): SkillCatalogState {
  const [state, setState] = useState<SkillCatalogState>({ skills: [], loading: true, error: false });

  useEffect(() => {
    let active = true;
    loadSkills()
      .then((skills) => {
        if (active) setState({ skills, loading: false, error: false });
      })
      .catch(() => {
        // Reset the cache so a later mount can retry after a transient failure.
        cache = null;
        if (active) setState({ skills: [], loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
