"use client";

import { use } from "react";
import type { AshLocale } from "@ash/shared";
import { getPraxisClient } from "@/lib/praxis/client";
import { AllTasksList } from "@/components/workbench/tasks/all-tasks-list";

type PageProps = {
  params: Promise<{ locale: AshLocale }>;
};

export default function AllTasksPage({ params }: PageProps) {
  const { locale } = use(params);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <AllTasksList locale={locale} client={getPraxisClient()} />
    </div>
  );
}
