"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useDeliverableText } from "./use-deliverable-text";

export function MarkdownViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-body-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{text ?? ""}</ReactMarkdown>
    </div>
  );
}
