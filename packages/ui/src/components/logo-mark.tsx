import * as React from "react";

import { cn } from "../lib/utils";

export interface LogoMarkProps extends React.ComponentProps<"svg"> {
  /**
   * Accessible name for non-decorative use. Omit when adjacent visible brand
   * text, such as the Wordmark, already labels the mark.
   */
  title?: string;
}

function LogoMark({ className, title, ...props }: LogoMarkProps) {
  const accessibilityProps = title
    ? ({ role: "img" as const } satisfies React.SVGProps<SVGSVGElement>)
    : ({ "aria-hidden": true } satisfies React.SVGProps<SVGSVGElement>);

  return (
    <svg
      data-slot="logo-mark"
      viewBox="0 0 32 32"
      className={cn("size-6 shrink-0 text-foreground", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...accessibilityProps}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        data-slot="logo-mark-shadow"
        d="M16 2.75C23.04 2.75 28.75 8.39 28.75 15.35C28.75 20.74 25.34 25.44 20.36 27.18L16 29L11.64 27.18C6.66 25.44 3.25 20.74 3.25 15.35C3.25 8.39 8.96 2.75 16 2.75Z"
        fill="currentColor"
      />
      <path
        data-slot="logo-mark-core"
        d="M10.55 10.35H16.95L21.45 14.6V21.55C21.45 22.33 20.83 22.95 20.05 22.95H11.95C11.17 22.95 10.55 22.33 10.55 21.55V10.35Z"
        fill="var(--background)"
      />
      <path
        data-slot="logo-mark-fold"
        d="M16.95 10.35V13.35C16.95 14.04 17.51 14.6 18.2 14.6H21.45"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <circle
        data-slot="logo-mark-ember"
        cx="16"
        cy="17.35"
        r="1.85"
        fill="var(--ember)"
      />
    </svg>
  );
}

export { LogoMark };
