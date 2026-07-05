import type { ReactNode } from "react";
import { LogoMark } from "@ash/ui/logo-mark";
import { Wordmark } from "@ash/ui/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="inline-flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground">
              <LogoMark className="size-6" />
            </span>
            <Wordmark className="font-display" />
          </h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
