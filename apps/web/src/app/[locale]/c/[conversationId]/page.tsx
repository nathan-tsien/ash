import { notFound } from "next/navigation";
import {
  getConversation,
  getMockConversations,
  isAshLocale,
  type AshLocale,
} from "@ash/shared";
import { WorkbenchLayout } from "@/components/workbench/workbench-layout";

type PageProps = {
  params: Promise<{ locale: string; conversationId: string }>;
};

export default async function ConversationPage({ params }: PageProps) {
  const { locale, conversationId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const conversations = getMockConversations(ashLocale);
  const active = getConversation(conversationId, ashLocale);
  if (!active) {
    notFound();
  }

  return <WorkbenchLayout locale={ashLocale} conversations={conversations} active={active} />;
}
