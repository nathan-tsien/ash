import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

// Shared status dot primitive (UX-7 / IMPL-7). Variants are visual names
// (running/success/error/idle), deliberately not app domain statuses, so the
// component stays presentation-only; callers map domain status -> variant.
// Base size is size-2: the drifted ad-hoc dots used size-1.5 (sidebar rows)
// and size-2 (workspace task card); size-2 keeps the pulse animation legible
// and reads better against text-body-sm row titles, so the smaller sites are
// normalized up rather than down.
const statusDotVariants = cva("size-2 shrink-0 rounded-full", {
  variants: {
    status: {
      running: "animate-pulse bg-status-running",
      success: "bg-status-success",
      error: "bg-destructive",
      idle: "bg-muted-foreground/40",
    },
  },
  defaultVariants: {
    status: "idle",
  },
});

export interface StatusDotProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusDotVariants> {
  // Screen-reader label rendered as a sibling sr-only span. Required in
  // spirit wherever no adjacent visible text states the status (UX-7): the
  // dot itself is decorative (aria-hidden).
  label?: string;
}

function StatusDot({ className, status, label, ...props }: StatusDotProps) {
  return (
    <>
      <span
        data-slot="status-dot"
        aria-hidden
        className={cn(statusDotVariants({ status }), className)}
        {...props}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}

export { StatusDot, statusDotVariants };
