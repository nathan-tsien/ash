"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useDeliverableText } from "./use-deliverable-text";

function lang(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function CodeViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  const fence = "```" + lang(deliverable.name) + "\n" + (text ?? "") + "\n```";
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-caption">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{fence}</ReactMarkdown>
    </div>
  );
}
