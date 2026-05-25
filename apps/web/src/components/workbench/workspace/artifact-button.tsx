"use client";

import type { Artifact } from "@ash/shared";
import { FileText, ImageIcon, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { notifyStub } from "../notify-stub";

export interface ArtifactButtonProps {
  artifact: Artifact;
  updatedAtLabel: string;
}

export function ArtifactButton({ artifact, updatedAtLabel }: ArtifactButtonProps) {
  const t = useTranslations("Workbench");

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-sm"
      onClick={() => {
        if (artifact.kind === "link" && /^https?:\/\//u.test(artifact.preview)) {
          window.open(artifact.preview, "_blank", "noopener,noreferrer");
          return;
        }
        notifyStub(t("artifactPreviewAlert"));
      }}
    >
      <div className="flex items-start gap-2">
        <ArtifactIcon kind={artifact.kind} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight">{artifact.title}</p>
          <p className="mt-1 line-clamp-3 text-[12px] text-muted-foreground">
            {artifact.preview}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">{updatedAtLabel}</p>
        </div>
      </div>
    </button>
  );
}

function ArtifactIcon({ kind }: { kind: Artifact["kind"] }) {
  switch (kind) {
    case "code":
      return <FileText className="size-5 shrink-0 text-muted-foreground" />;
    case "image":
      return <ImageIcon className="size-5 shrink-0 text-muted-foreground" />;
    case "link":
      return <Link2 className="size-5 shrink-0 text-muted-foreground" />;
    default:
      return <FileText className="size-5 shrink-0 text-muted-foreground" />;
  }
}
