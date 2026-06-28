"use client";
import type { Deliverable } from "@ash/shared";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function PdfViewer({ deliverable }: { deliverable: Deliverable }) {
  return <iframe src={deliverableHref(deliverable.uri)} title={deliverable.name} className="h-[70vh] w-full rounded-md border border-border" />;
}
