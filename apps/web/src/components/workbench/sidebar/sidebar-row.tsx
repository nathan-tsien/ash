import type { AshLocale, Conversation } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Link } from "@/i18n/navigation";

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
        className={cn(
          "block rounded-xl px-3 py-2.5 transition-colors",
          isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
        )}
      >
        <p
          className={cn(
            "truncate text-body-sm",
            c.unread ? "font-semibold" : "font-medium",
          )}
        >
          {c.title}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.preview}</p>
        <p className="mt-2 text-label text-muted-foreground">
          {formatRelativeTime(c.updatedAt, locale)}
        </p>
      </Link>
    </li>
  );
}
