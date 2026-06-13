"use client";
import { useEffect } from "react";
import type { Task } from "@ash/shared";
import { useSeedTask } from "./task-run-provider";

/** Seeds a server-fetched task into the provider on mount (deep-link cold load). */
export function TaskSeeder({ task }: { task: Task }) {
  const seed = useSeedTask();
  useEffect(() => {
    seed(task);
  }, [seed, task]);
  return null;
}
