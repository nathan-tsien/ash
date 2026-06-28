"use client";

import type { Deliverable } from "@ash/shared";
import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeliverableRow({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const href = deliverableHref(deliverable.uri);

  if (deliverable.kind === "image") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("deliverableOpen")}
        className="block overflow-hidden rounded-lg border border-border bg-card"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={deliverable.name} className="max-h-48 w-full object-cover" />
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-body-sm font-medium">{deliverable.name}</span>
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{formatSize(deliverable.sizeBytes)}</span>
        </div>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium">{deliverable.name}</p>
        <p className="text-caption tabular-nums text-muted-foreground">{formatSize(deliverable.sizeBytes)}</p>
      </div>
      <a
        href={href}
        download={deliverable.name}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("deliverableDownload")}
      >
        <Download className="size-3.5" aria-hidden />
        {t("deliverableDownload")}
      </a>
    </div>
  );
}
