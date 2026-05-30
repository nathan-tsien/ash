"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

export function BillingSection() {
  const t = useTranslations("Settings");

  return (
    <div>
      <SectionHeader
        heading={t("billing.heading")}
        description={t("billing.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("billing.currentPlan")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-lg font-semibold">{t("billing.explorerPlan")}</p>
            <Badge variant="muted">{t("phase2Badge")}</Badge>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("billing.usageHeading")}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {t("billing.usageMessages")}
              </span>
              <span className="text-sm font-medium tabular-nums">0</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                {t("billing.usageRuns")}
              </span>
              <span className="text-sm font-medium tabular-nums">0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button disabled>{t("billing.upgradeCta")}</Button>
      </div>
    </div>
  );
}
