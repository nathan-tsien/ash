import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AllTasksList } from "../all-tasks-list";

const messages = { Workbench: { allTasksTitle: "全部任务", loadMore: "加载更多", tasksEmpty: "还没有任务", tasksError: "加载失败，点击重试" } };
const wrap = (ui: React.ReactNode) => <NextIntlClientProvider locale="zh" messages={messages}>{ui}</NextIntlClientProvider>;

describe("AllTasksList", () => {
  it("renders fetched tasks and loads the next page", async () => {
    const client = {
      listTasks: vi.fn()
        .mockResolvedValueOnce({ items: [{ id: "a", title: "甲", status: "running", project_id: null }], next_cursor: "c2" })
        .mockResolvedValueOnce({ items: [{ id: "b", title: "乙", status: "completed", project_id: null }], next_cursor: null }),
    };
    render(wrap(<AllTasksList locale="zh" client={client as never} />));
    await waitFor(() => screen.getByText("甲"));
    fireEvent.click(screen.getByText("加载更多"));
    await waitFor(() => screen.getByText("乙"));
    expect(screen.queryByText("加载更多")).toBeNull();
  });

  it("shows the empty state when there are no tasks", async () => {
    const client = { listTasks: vi.fn().mockResolvedValue({ items: [], next_cursor: null }) };
    render(wrap(<AllTasksList locale="zh" client={client as never} />));
    await waitFor(() => screen.getByText("还没有任务"));
  });

  it("renders task links as non-prefixed app-zone hrefs (no locale prefix)", async () => {
    const taskId = "task-xyz-123";
    const client = {
      listTasks: vi.fn().mockResolvedValue({
        items: [{ id: taskId, title: "测试任务", status: "running", project_id: null }],
        next_cursor: null,
      }),
    };
    render(wrap(<AllTasksList locale="zh" client={client as never} />));
    const link = await waitFor(() => screen.getByRole("link", { name: "测试任务" }));
    expect(link).toHaveAttribute("href", `/app/task/${taskId}`);
    // Explicitly confirm there is no locale prefix — would 404 in app-zone routing
    expect(link).not.toHaveAttribute("href", `/zh/app/task/${taskId}`);
  });
});
