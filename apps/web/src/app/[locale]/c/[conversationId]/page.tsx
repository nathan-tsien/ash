import { notFound } from "next/navigation";
import {
  isAshLocale,
  isShowcaseCaseId,
  showcaseCaseMap,
  type AshLocale,
} from "@ash/shared";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { DemoBanner } from "@/components/workbench/demo-banner";
import {
  getActiveConversation,
  listConversations,
} from "@/server/conversations";

type PageProps = {
  params: Promise<{ locale: string; conversationId: string }>;
  searchParams: Promise<{ demo?: string }>;
};

export default async function ConversationPage({ params, searchParams }: PageProps) {
  const { locale, conversationId } = await params;
  const { demo } = await searchParams;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const conversations = await listConversations(ashLocale);
  const active = await getActiveConversation(conversationId, ashLocale);
  if (!active) {
    notFound();
  }

  const matchedCase =
    demo && isShowcaseCaseId(demo) && showcaseCaseMap[demo].conversationId === conversationId
      ? demo
      : undefined;

  const chatBanner = matchedCase ? (
    <DemoBanner caseId={matchedCase} locale={ashLocale} conversationId={conversationId} />
  ) : undefined;

  return (
    <WorkbenchShell
      locale={ashLocale}
      conversations={conversations}
      active={active}
      chatBanner={chatBanner}
    />
  );
}
