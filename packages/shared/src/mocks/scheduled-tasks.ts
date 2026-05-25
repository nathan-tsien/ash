import type { ScheduledTask } from "../types";
import type { AshLocale } from "./locale";

export const mockScheduledTasksZh: ScheduledTask[] = [
  {
    id: "sched-1",
    label: "每日产品速报",
    cron: "每天 09:00",
    nextRunAt: "2026-05-27T09:00:00+08:00",
    status: "enabled",
    description:
      "汇总过去 24h Hacker News / 行业头条，生成三条产品洞察摘要并推送到收件箱。",
  },
  {
    id: "sched-2",
    label: "周一选题策划",
    cron: "周一 10:00",
    nextRunAt: "2026-05-26T10:00:00+08:00",
    status: "enabled",
    description:
      "基于上周内容表现与热点趋势，自动生成 5 个自媒体选题方向与标题草案。",
  },
  {
    id: "sched-3",
    label: "月度团队周报合并",
    cron: "每月 1 号 09:00",
    nextRunAt: "2026-06-01T09:00:00+08:00",
    status: "paused",
    description:
      "从 Slack 导出与 Notion 项目页拉取进展，合并为团队月报草稿（当前已暂停）。",
  },
  {
    id: "sched-4",
    label: "凌晨自动同步 Notion",
    cron: "每天 02:00",
    nextRunAt: "2026-05-27T02:00:00+08:00",
    status: "errored",
    description:
      "双向同步 Notion 知识库索引；上次运行因 OAuth 令牌过期失败，需重新授权。",
  },
];

export const mockScheduledTasksEn: ScheduledTask[] = [
  {
    id: "sched-1",
    label: "Daily product digest",
    cron: "0 9 * * *",
    nextRunAt: "2026-05-27T09:00:00+08:00",
    status: "enabled",
    description:
      "Summarize the last 24h of Hacker News and industry headlines into three product insight bullets.",
  },
  {
    id: "sched-2",
    label: "Monday topic planning",
    cron: "Mon 10:00",
    nextRunAt: "2026-05-26T10:00:00+08:00",
    status: "enabled",
    description:
      "Generate five creator topic angles and title drafts from last week's performance and trending signals.",
  },
  {
    id: "sched-3",
    label: "Monthly team report merge",
    cron: "1st of month 09:00",
    nextRunAt: "2026-06-01T09:00:00+08:00",
    status: "paused",
    description:
      "Pull Slack exports and Notion project pages into a monthly team report draft (currently paused).",
  },
  {
    id: "sched-4",
    label: "Overnight Notion sync",
    cron: "0 2 * * *",
    nextRunAt: "2026-05-27T02:00:00+08:00",
    status: "errored",
    description:
      "Bidirectional Notion knowledge-base index sync; last run failed due to expired OAuth token — re-authorization required.",
  },
];

export function getMockScheduledTasks(locale: AshLocale): ScheduledTask[] {
  return locale === "en" ? mockScheduledTasksEn : mockScheduledTasksZh;
}
