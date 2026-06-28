"use client";

import { useEffect, useState } from "react";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

const MAX_BYTES = 512 * 1024;

/** Fetch a text-family deliverable's content through the BFF proxy (cookie auth). */
export function useDeliverableText(uri: string): { text: string | null; loading: boolean; error: string | null } {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setText(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(deliverableHref(uri), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.text();
        if (body.length > MAX_BYTES) {
          setError("too-large");
        } else {
          setText(body);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message || "error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [uri]);

  return { text, loading, error };
}
