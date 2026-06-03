import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";
import { getActiveTask } from "@/server/tasks";

type PageProps = {
  params: Promise<{ locale: string; taskId: string }>;
};

export default async function TaskPage({ params }: PageProps) {
  const { locale, taskId } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  // May be undefined for a session-only run the server does not know about; the
  // client resolves it from TaskRunProvider via the `taskId` prop. Only an id
  // unknown to both renders the in-shell "run not found" state.
  const activeTask = await getActiveTask(taskId, ashLocale);

  return (
    <WorkbenchApp
      locale={ashLocale}
      tasks={tasks}
      projects={projects}
      activeTask={activeTask}
      taskId={taskId}
      viewMode="task"
    />
  );
}
