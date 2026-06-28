import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

// Presentation-only status chip (COLOR-3 / IMPL-7). Variants are visual names,
// not app domain statuses — callers map domain -> variant, so packages/ui never
// imports domain types. Built only from status token triplets + muted (no raw
// palette literals, COLOR-2).
const statusChipVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium",
  {
    variants: {
      variant: {
        running: "bg-status-running-soft text-status-running-foreground",
        success: "bg-status-success-soft text-status-success-foreground",
        warning: "bg-status-warning-soft text-status-warning-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface StatusChipProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusChipVariants> {}

function StatusChip({ className, variant, ...props }: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      className={cn(statusChipVariants({ variant }), className)}
      {...props}
    />
  );
}

export { StatusChip, statusChipVariants };
