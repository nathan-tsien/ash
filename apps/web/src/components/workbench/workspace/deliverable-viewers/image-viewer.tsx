"use client";
import type { Deliverable } from "@ash/shared";
import { deliverableHref } from "@/lib/praxis/deliverable-href";

export function ImageViewer({ deliverable }: { deliverable: Deliverable }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={deliverableHref(deliverable.uri)} alt={deliverable.name} className="mx-auto max-h-[70vh] w-auto object-contain" />;
}
