"use client";

import {
  formatRelativeTime,
  getMockConnectors,
  isAshLocale,
  type ConnectorKind,
  type ConnectorStatus,
} from "@ash/shared";
import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { SectionHeader } from "../section-header";

const KIND_ORDER: ConnectorKind[] = ["notes", "mcp", "file", "calendar"];

const KIND_LABEL_KEYS: Record<ConnectorKind, string> = {
  notes: "connectors.kindNotes",
  mcp: "connectors.kindMcp",
  file: "connectors.kindFile",
  calendar: "connectors.kindCalendar",
};

function statusBadgeVariant(
  status: ConnectorStatus,
): "success" | "muted" | "destructive" {
  switch (status) {
    case "connected":
      return "success";
    case "disconnected":
      return "muted";
    case "error":
      return "destructive";
  }
}

function statusLabelKey(status: ConnectorStatus): string {
  switch (status) {
    case "connected":
      return "connectors.statusConnected";
    case "disconnected":
      return "connectors.statusDisconnected";
    case "error":
      return "connectors.statusError";
  }
}

export function ConnectorsSection() {
  const localeRaw = useLocale();
  const locale = isAshLocale(localeRaw) ? localeRaw : "zh";
  const t = useTranslations("Settings");
  const connectors = getMockConnectors(locale);

  const grouped = useMemo(() => {
    const map = new Map<ConnectorKind, typeof connectors>();
    for (const kind of KIND_ORDER) {
      map.set(kind, []);
    }
    for (const connector of connectors) {
      map.get(connector.kind)?.push(connector);
    }
    return KIND_ORDER.map((kind) => ({
      kind,
      items: map.get(kind) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [connectors]);

  return (
    <div>
      <SectionHeader
        heading={t("connectors.heading")}
        description={t("connectors.description")}
      />

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("connectors.empty")}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ kind, items }) => (
            <div key={kind}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(KIND_LABEL_KEYS[kind])}
              </p>
              <ul className="space-y-2">
                {items.map((connector) => (
                  <li
                    key={connector.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{connector.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {connector.description}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(connector.status)}>
                        {t(statusLabelKey(connector.status))}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(connector.updatedAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button disabled className="gap-2">
          {t("connectors.addAction")}
          <Badge variant="muted">{t("phase2Badge")}</Badge>
        </Button>
      </div>
    </div>
  );
}
