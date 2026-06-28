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
  const body = text ?? "";
  // Use an opening fence longer than the longest backtick run in the content so
  // a ``` inside the file can never close the fence early and spill the tail into
  // markdown rendering (rendering-integrity, e.g. agent-authored snippets).
  const runs = body.match(/`+/g);
  const fenceLen = Math.max(3, (runs ? Math.max(...runs.map((r) => r.length)) : 0) + 1);
  const f = "`".repeat(fenceLen);
  const fence = `${f}${lang(deliverable.name)}\n${body}\n${f}`;
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-caption">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{fence}</ReactMarkdown>
    </div>
  );
}
