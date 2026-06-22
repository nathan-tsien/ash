import type { AshLocale, Conversation } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import Link from "next/link";

export function SidebarRow({
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
    <li>
      <Link
        href={`/c/${c.id}`}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "block rounded-xl px-3 py-2.5 transition-colors",
          // Same active vocabulary as TaskSection rows: 2px accent rail +
          // weight, never a louder color (PRIN-4, sibling consistency).
          isActive
            ? "border-l-2 border-sidebar-rail bg-sidebar-accent"
            : "hover:bg-sidebar-accent/60",
        )}
      >
        <p
          className={cn(
            "truncate text-body-sm",
            isActive || c.unread ? "font-semibold" : "font-medium",
          )}
        >
          {c.title}
        </p>
        <p className="mt-1 line-clamp-1 text-label text-muted-foreground">{c.preview}</p>
        <p className="mt-2 text-label font-normal text-muted-foreground">
          {formatRelativeTime(c.updatedAt, locale)}
        </p>
      </Link>
    </li>
  );
}
