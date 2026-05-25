import { notFound } from "next/navigation";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import {
  getActiveConversation,
  listConversations,
} from "@/server/conversations";

type PageProps = {
  params: Promise<{ locale: string; conversationId: string }>;
};

export default async function ConversationPage({ params }: PageProps) {
  const { locale, conversationId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const conversations = await listConversations(ashLocale);
  const active = await getActiveConversation(conversationId, ashLocale);
  if (!active) {
    notFound();
  }

  return (
    <WorkbenchShell locale={ashLocale} conversations={conversations} active={active} />
  );
}
