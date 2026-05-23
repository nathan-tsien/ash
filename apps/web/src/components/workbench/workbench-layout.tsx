"use client";

import type {
  Artifact,
  AshLocale,
  Conversation,
  Message,
  PlanStep,
  ToolTrace,
} from "@ash/shared";
import { formatRelativeTime, mockUser } from "@ash/shared";
import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { Input } from "@ash/ui/input";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { cn } from "@ash/ui/lib/utils";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useMemo, useState } from "react";

export interface WorkbenchLayoutProps {
  locale: AshLocale;
  conversations: Conversation[];
  active: Conversation;
}

/** Main three-pane workbench chrome (Sidebar / Chat / Workspace). */
export function WorkbenchLayout(props: WorkbenchLayoutProps) {
  return <WorkbenchChrome key={props.active.id} {...props} />;
}

function WorkbenchChrome({
  locale,
  conversations,
  active,
}: WorkbenchLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const [extraMessages, setExtraMessages] = useState<Message[]>([]);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const t = useTranslations("Workbench");

  const filtered = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q),
    );
  }, [conversations, sidebarQuery]);

  const messages = useMemo(
    () => [...active.messages, ...extraMessages],
    [active.messages, extraMessages],
  );

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `local-user-${crypto.randomUUID()}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    const ack: Message = {
      id: `local-bot-${crypto.randomUUID()}`,
      role: "assistant",
      content: t("chatMockAcknowledgement"),
      createdAt: new Date(Date.now() + 400).toISOString(),
    };
    setExtraMessages((prev) => [...prev, userMsg, ack]);
    setDraft("");
  }, [draft, t]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          sidebarCollapsed ? "w-[56px]" : "w-[260px]",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5",
            sidebarCollapsed && "flex-col justify-center gap-2 px-1 py-3",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent",
                )}
                aria-label={t("sidebarHomeAria")}
              >
                <Sparkles className="size-[18px]" aria-hidden />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("tooltipHomeChrome")}</TooltipContent>
          </Tooltip>

          {!sidebarCollapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-semibold">{t("sidebarBrand")}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="size-9 shrink-0"
                    aria-label={t("collapseAria")}
                    onClick={() => setSidebarCollapsed((v) => !v)}
                  >
                    <ChevronLeft className="size-[18px]" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sidebarCollapsed ? t("expandSidebarTooltip") : t("collapseSidebarTooltip")}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {sidebarCollapsed ? null : (
          <>
            <div className="space-y-2 px-3 py-3">
              <Button variant="pill" size="sm" className="w-full justify-center gap-2" asChild>
                <Link href="/">
                  <Plus className="size-4" aria-hidden />
                  {t("newTask")}
                </Link>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="w-full gap-2 text-muted-foreground"
                    aria-label={t("commandPaletteAria")}
                  >
                    <span className="text-xs">{t("cmdK")}</span>
                    <Search className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("commandPaletteTooltip")}</TooltipContent>
              </Tooltip>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 rounded-xl pl-8 text-sm"
                  placeholder={t("searchPlaceholder")}
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  aria-label={t("searchAria")}
                />
              </div>
            </div>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-0.5 py-2 pr-2">
                {filtered.map((c) => (
                  <SidebarRow key={c.id} locale={locale} c={c} activeId={active.id} />
                ))}
                {filtered.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t("emptySearch")}</p>
                )}
              </div>
            </ScrollArea>
            <FooterAccount />
          </>
        )}

        {sidebarCollapsed && (
          <div className="mt-auto flex flex-col items-center gap-2 pb-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10 rounded-xl" asChild>
                  <Link href="/" aria-label={t("newTask")}>
                    <Plus className="size-[18px]" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("newTask")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10 rounded-xl" asChild>
                  <Link href="/settings" aria-label={t("settingsAria")}>
                    <Settings className="size-[18px]" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("settingsAria")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-xl"
                  aria-label={t("expandSidebarRailAria")}
                  onClick={() => setSidebarCollapsed((v) => !v)}
                >
                  <ChevronRight className="size-[18px]" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("expandSidebarTooltip")}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight">{active.title}</h1>
              <p className="truncate text-xs text-muted-foreground">{active.preview}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="size-9 rounded-xl"
                  aria-label={workspaceCollapsed ? t("expandWorkbenchAria") : t("collapseWorkbenchAria")}
                  onClick={() => setWorkspaceCollapsed((v) => !v)}
                >
                  {workspaceCollapsed ? (
                    <PanelRightOpen className="size-[18px]" aria-hidden />
                  ) : (
                    <PanelRightClose className="size-[18px]" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {workspaceCollapsed ? t("expandWorkbenchTooltip") : t("collapseWorkbenchTooltip")}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} locale={locale} message={m} />
            ))}
            {active.status === "running" && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("thinkingPlaceholder")}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-xs">
              <textarea
                className="max-h-[168px] min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
                placeholder={t("textareaPlaceholder")}
                value={draft}
                aria-label={t("textareaAria")}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendDraft();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">{t("shortcutHint")}</p>
              <Button type="button" variant="pill" size="sm" onClick={sendDraft}>
                {t("send")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {!workspaceCollapsed && (
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-workspace">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-semibold">{t("workspaceTitle")}</span>
            <Badge variant="muted" className="ml-auto text-[11px]">
              {t("mockBadge")}
            </Badge>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              <PlanCard steps={active.plan} />
              <Separator />
              <ToolsCard traces={active.toolTraces} />
              <Separator />
              <ArtifactsCard locale={locale} artifacts={active.artifacts} />
            </div>
          </ScrollArea>
        </aside>
      )}

      {workspaceCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="pill"
              size="sm"
              className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
              type="button"
              aria-label={t("expandWorkbenchAria")}
              onClick={() => setWorkspaceCollapsed(false)}
            >
              <PanelRightOpen className="size-4" aria-hidden />
              {t("workspaceTitle")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{t("workspaceFabTooltip")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function SidebarRow({
  locale,
  c,
  activeId,
}: {
  locale: AshLocale;
  c: Conversation;
  activeId: string;
}) {
  const isActive = c.id === activeId;
  return (
    <Link
      href={`/c/${c.id}`}
      className={cn(
        "block rounded-xl px-3 py-2.5 transition-colors",
        isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
      )}
    >
      <p className={cn("truncate text-[13px] leading-snug", c.unread ? "font-semibold" : "font-medium")}>
        {c.title}
      </p>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.preview}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{formatRelativeTime(c.updatedAt, locale)}</p>
    </Link>
  );
}

function FooterAccount() {
  const t = useTranslations("Workbench");
  return (
    <div className="border-t border-sidebar-border p-3">
      <Button variant="ghost" size="sm" className="h-auto w-full justify-start gap-2 px-2 py-2" asChild>
        <Link href="/settings">
          <Avatar className="size-8">
            <AvatarFallback className="text-[11px]">{mockUser.avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium">{t("accountLabel")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t("accountSub")}</p>
          </div>
          <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

function MessageBubble({ message, locale }: { message: Message; locale: AshLocale }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div className={cn(isUser ? "max-w-[90%]" : "max-w-[90%]", isUser ? "items-end text-right" : "items-start")}>
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-secondary text-secondary-foreground" : "border border-border bg-card",
          )}
        >
          <p className="whitespace-pre-wrap text-left">{message.content}</p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatRelativeTime(message.createdAt, locale)}
        </p>
      </div>
    </div>
  );
}

function PlanCard({ steps }: { steps: PlanStep[] }) {
  const t = useTranslations("Workbench");
  return (
    <div className="space-y-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{t("planHeading")}</h2>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 text-sm leading-snug">
            <PlanStatusIcon status={step.status} />
            <span
              className={cn(
                "flex-1",
                step.status === "running" && "border-l-2 border-primary pl-3 -ml-[2px]",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlanStatusIcon({ status }: { status: PlanStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;
  if (status === "failed") return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  if (status === "running") return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />;
}

function ToolsCard({ traces }: { traces: ToolTrace[] }) {
  const t = useTranslations("Workbench");
  return (
    <div className="space-y-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{t("toolsHeading")}</h2>
      {traces.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyTools")}</p>
      ) : (
        <ul className="space-y-3">
          {traces.map((trace) => (
            <li key={trace.id} className="flex gap-2 text-sm">
              <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md bg-muted px-1.5 py-px text-[11px] font-mono">{trace.toolName}</code>
                  {trace.durationMs !== undefined ? (
                    <span className="text-[11px] text-muted-foreground">{trace.durationMs} ms</span>
                  ) : trace.status === "running" ? (
                    <Loader2 className="inline size-3 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{trace.summary}</p>
              </div>
              <ToolBadge status={trace.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolBadge({ status }: { status: ToolTrace["status"] }) {
  if (status === "success") return <Badge variant="success">ok</Badge>;
  if (status === "error") return <Badge variant="destructive">err</Badge>;
  return <Badge variant="secondary">···</Badge>;
}

function ArtifactsCard({ locale, artifacts }: { locale: AshLocale; artifacts: Artifact[] }) {
  const t = useTranslations("Workbench");
  return (
    <div className="space-y-2 pb-8">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("artifactsHeading")}
      </h2>
      {artifacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyArtifacts")}</p>
      ) : (
        <div className="space-y-2">
          {artifacts.map((a) => (
            <button
              key={a.id}
              type="button"
              className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-sm"
              onClick={() => {
                if (a.kind === "link" && /^https?:\/\//u.test(a.preview)) {
                  window.open(a.preview, "_blank", "noopener,noreferrer");
                  return;
                }
                alert(t("artifactPreviewAlert"));
              }}
            >
              <div className="flex items-start gap-2">
                <ArtifactIcon kind={a.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-tight">{a.title}</p>
                  <p className="mt-1 line-clamp-3 text-[12px] text-muted-foreground">{a.preview}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {formatRelativeTime(a.updatedAt, locale)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtifactIcon({ kind }: { kind: Artifact["kind"] }) {
  switch (kind) {
    case "code":
      return <FileText className="size-5 shrink-0 text-muted-foreground" />;
    case "image":
      return <ImageIcon className="size-5 shrink-0 text-muted-foreground" />;
    case "link":
      return <Link2 className="size-5 shrink-0 text-muted-foreground" />;
    default:
      return <FileText className="size-5 shrink-0 text-muted-foreground" />;
  }
}
