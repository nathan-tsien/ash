import { getLocale } from "next-intl/server";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { WorkbenchApp } from "@/components/workbench/workbench-app";
import { TaskSeeder } from "@/components/workbench/task-seeder";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";
import { getActiveTask } from "@/server/tasks";

type PageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskPage({ params }: PageProps) {
  const { taskId } = await params;
  // Locale comes from the `ash_locale` cookie via the i18n request config.
  const locale = await getLocale();
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  // May be undefined for a session-only run the server does not know about; the
  // client resolves it from TaskRunProvider via the `taskId` prop. Only an id
  // unknown to both renders the in-shell "run not found" state.
  const activeTask = await getActiveTask(taskId, ashLocale);

  return (
    <>
      {activeTask && <TaskSeeder task={activeTask} />}
      <WorkbenchApp
        locale={ashLocale}
        tasks={tasks}
        projects={projects}
        activeTask={activeTask}
        taskId={taskId}
        viewMode="task"
      />
    </>
  );
}
