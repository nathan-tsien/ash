import type { Conversation, UserProfile } from "../types";

export const mockUser: UserProfile = {
  name: "Nathan",
  email: "nathan@example.com",
  avatarFallback: "NT",
};

export const mockConversationsZh: Conversation[] = [
  {
    id: "conv-1",
    title: "Q2 产品路线图调研",
    preview: "已整理竞品功能对比与三条产品方向建议…",
    updatedAt: "2026-05-23T10:42:00+08:00",
    unread: true,
    status: "running",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content:
          "帮我调研 2026 年 AI Agent 产品趋势，重点看 Manus、Cursor Agent 和 Claude Code，输出一份结构化报告大纲。",
        createdAt: "2026-05-23T10:38:00+08:00",
      },
      {
        id: "msg-2",
        role: "assistant",
        content:
          "好的，我会先从公开资料与产品文档入手，整理 Agent UX 模式差异，再给出报告大纲与下一步写作建议。",
        createdAt: "2026-05-23T10:38:12+08:00",
      },
      {
        id: "msg-3",
        role: "assistant",
        content:
          "我已经完成初步检索，正在对比三者的任务编排、Plan 面板和工作区设计。接下来会生成报告目录与关键结论摘要。",
        createdAt: "2026-05-23T10:41:30+08:00",
        isStreaming: true,
      },
    ],
    plan: [
      { id: "p1", label: "检索公开资料与产品文档", status: "done" },
      { id: "p2", label: "对比 Agent UX 与工作区模式", status: "running" },
      { id: "p3", label: "生成报告大纲与结论摘要", status: "pending" },
      { id: "p4", label: "整理引用来源与延伸阅读", status: "pending" },
    ],
    toolTraces: [
      {
        id: "t1",
        toolName: "web_search",
        summary: "搜索 Manus Agent UX、Cursor Plan Mode",
        status: "success",
        startedAt: "2026-05-23T10:38:20+08:00",
        durationMs: 4200,
      },
      {
        id: "t2",
        toolName: "read_page",
        summary: "读取 manus.im/docs 与架构说明",
        status: "success",
        startedAt: "2026-05-23T10:39:05+08:00",
        durationMs: 2800,
      },
      {
        id: "t3",
        toolName: "write_document",
        summary: "起草报告大纲 v0.1",
        status: "running",
        startedAt: "2026-05-23T10:41:45+08:00",
      },
    ],
    artifacts: [
      {
        id: "a1",
        kind: "document",
        title: "AI Agent 趋势报告 · 大纲",
        preview: "1. 执行摘要\n2. Agent UX 范式对比\n3. 工作区与 Artifact 设计…",
        updatedAt: "2026-05-23T10:41:50+08:00",
      },
      {
        id: "a2",
        kind: "link",
        title: "Manus Documentation",
        preview: "https://manus.im/docs",
        updatedAt: "2026-05-23T10:39:10+08:00",
      },
    ],
  },
  {
    id: "conv-2",
    title: "自媒体选题策划",
    preview: "本周 5 个选题方向，含标题与发布节奏建议",
    updatedAt: "2026-05-22T18:20:00+08:00",
    status: "completed",
    messages: [
      {
        id: "msg-4",
        role: "user",
        content: "给 AI 工具类账号策划本周 5 个选题。",
        createdAt: "2026-05-22T18:10:00+08:00",
      },
      {
        id: "msg-5",
        role: "assistant",
        content: "已生成 5 个选题，并按短视频 / 图文 / 长文做了分发建议。",
        createdAt: "2026-05-22T18:18:00+08:00",
      },
    ],
    plan: [
      { id: "p1", label: "分析账号历史表现", status: "done" },
      { id: "p2", label: "生成 5 个选题方向", status: "done" },
      { id: "p3", label: "输出发布节奏建议", status: "done" },
    ],
    toolTraces: [
      {
        id: "t1",
        toolName: "analyze_metrics",
        summary: "读取近 30 天内容表现",
        status: "success",
        startedAt: "2026-05-22T18:11:00+08:00",
        durationMs: 1900,
      },
    ],
    artifacts: [
      {
        id: "a1",
        kind: "document",
        title: "本周选题清单",
        preview: "1. Agent 不是 Chatbot\n2. 三栏工作区设计拆解…",
        updatedAt: "2026-05-22T18:17:00+08:00",
      },
    ],
  },
  {
    id: "conv-3",
    title: "周报自动整理",
    preview: "等待你上传 Slack 导出文件…",
    updatedAt: "2026-05-21T09:05:00+08:00",
    status: "idle",
    messages: [
      {
        id: "msg-6",
        role: "assistant",
        content: "上传 Slack 导出或粘贴频道摘要，我可以帮你整理成周报。",
        createdAt: "2026-05-21T09:05:00+08:00",
      },
    ],
    plan: [{ id: "p1", label: "等待输入材料", status: "pending" }],
    toolTraces: [],
    artifacts: [],
  },
];
