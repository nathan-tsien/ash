"use client";

import type { Deliverable } from "@ash/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ash/ui/dialog";
import { useTranslations } from "next-intl";
import { deliverableHref } from "@/lib/praxis/deliverable-href";
import { pickDeliverableViewer } from "./deliverable-viewers/pick-viewer";
import { ImageViewer } from "./deliverable-viewers/image-viewer";
import { PdfViewer } from "./deliverable-viewers/pdf-viewer";
import { MarkdownViewer } from "./deliverable-viewers/markdown-viewer";
import { CodeViewer } from "./deliverable-viewers/code-viewer";
import { TextViewer } from "./deliverable-viewers/text-viewer";
import { NoPreview } from "./deliverable-viewers/no-preview";

function ViewerBody({ deliverable }: { deliverable: Deliverable }) {
  switch (pickDeliverableViewer(deliverable.mimeType, deliverable.name)) {
    case "image":
      return <ImageViewer deliverable={deliverable} />;
    case "pdf":
      return <PdfViewer deliverable={deliverable} />;
    case "markdown":
      return <MarkdownViewer deliverable={deliverable} />;
    case "code":
      return <CodeViewer deliverable={deliverable} />;
    case "text":
      return <TextViewer deliverable={deliverable} />;
    default:
      return <NoPreview deliverable={deliverable} />;
  }
}

export function DeliverableCanvas({
  deliverable,
  onClose,
}: {
  deliverable: Deliverable | null;
  onClose: () => void;
}) {
  const t = useTranslations("Workbench");
  return (
    <Dialog
      open={deliverable !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl" closeAriaLabel={t("deliverableClose")}>
        {deliverable ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-6">{deliverable.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <ViewerBody deliverable={deliverable} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <a
                href={deliverableHref(deliverable.uri)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-label font-medium hover:bg-accent"
              >
                {t("viewerOpenInNewTab")}
              </a>
              <a
                href={deliverableHref(deliverable.uri)}
                download={deliverable.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-label font-medium text-primary-foreground"
              >
                {t("deliverableDownload")}
              </a>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
