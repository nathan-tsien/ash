import { notFound } from "next/navigation";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";
import { getActiveProject } from "@/server/projects";

type PageProps = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { locale, projectId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const activeProject = await getActiveProject(projectId, ashLocale);

  if (!activeProject) {
    notFound();
  }

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      activeProject={activeProject}
      viewMode="project"
    />
  );
}
