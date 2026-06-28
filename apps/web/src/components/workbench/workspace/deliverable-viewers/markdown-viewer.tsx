"use client";
import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useDeliverableText } from "./use-deliverable-text";

// Open links in a new tab with noopener (parity with the chat markdown renderer).
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};

export function MarkdownViewer({ deliverable }: { deliverable: Deliverable }) {
  const t = useTranslations("Workbench");
  const { text, loading, error } = useDeliverableText(deliverable.uri);
  if (loading) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t("viewerLoading")}</p>;
  if (error) return <p className="py-12 text-center text-body-sm text-muted-foreground">{t(error === "too-large" ? "viewerTooLarge" : "viewerError")}</p>;
  return (
    <div className="prose-chat max-h-[70vh] overflow-auto text-body-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={MARKDOWN_COMPONENTS}>{text ?? ""}</ReactMarkdown>
    </div>
  );
}
