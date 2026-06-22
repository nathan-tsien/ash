import { getLocale } from "next-intl/server";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";

export default async function AppHomePage() {
  // No `[locale]` path segment in the app zone: locale comes from the
  // `ash_locale` cookie via the i18n request config.
  const locale = await getLocale();
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      viewMode="home"
    />
  );
}
