"use client";

import { useLocale } from "next-intl";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { getPraxisClient } from "@/lib/praxis/client";
import { AllTasksList } from "@/components/workbench/tasks/all-tasks-list";

export default function AllTasksPage() {
  // Locale flows from the `ash_locale` cookie through NextIntlClientProvider.
  const locale = useLocale();
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <AllTasksList locale={ashLocale} client={getPraxisClient()} />
    </div>
  );
}
