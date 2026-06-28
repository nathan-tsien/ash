"use client";

import type { Deliverable } from "@ash/shared";
import { useTranslations } from "next-intl";
import { DeliverableRow } from "./deliverable-row";

export function DeliverablesTab({
  deliverables,
}: {
  deliverables: Deliverable[];
}) {
  const t = useTranslations("Workbench");
  if (deliverables.length === 0) {
    return <p className="px-1 py-6 text-center text-body-sm text-muted-foreground">{t("deliverablesEmpty")}</p>;
  }
  return (
    <div className="space-y-2">
      {deliverables.map((d) => (
        <DeliverableRow key={d.id} deliverable={d} />
      ))}
    </div>
  );
}
