"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { useDeliverableText } from "./use-deliverable-text";

export function TextViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  return <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 text-caption font-mono whitespace-pre-wrap">{text}</pre>;
}
