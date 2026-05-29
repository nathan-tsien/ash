import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AppHomePage({ params }: PageProps) {
  const { locale } = await params;
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
