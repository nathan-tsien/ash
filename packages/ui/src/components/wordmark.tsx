import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Brand wordmark "ash." with the ember full stop (spec 2026-06-13 §7, COLOR-10).
 * Styled text, no logo asset — pass `font-display` via className on marketing surfaces.
 * The wordmark is a brand mark, not copy: it is intentionally not translated.
 */
function Wordmark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="wordmark"
      className={cn("font-semibold tracking-tight", className)}
      {...props}
    >
      ash<span className="text-ember">.</span>
    </span>
  );
}

export { Wordmark };
