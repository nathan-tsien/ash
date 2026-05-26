import type { Connector } from "../types";
import type { AshLocale } from "./locale";

export const mockConnectorsZh: Connector[] = [
  {
    id: "conn-notion",
    label: "Notion 工作区",
    provider: "Notion",
    kind: "notes",
    status: "connected",
    description: "同步页面索引与任务数据库，供 Agent 检索引用。",
    updatedAt: "2026-05-25T14:22:00+08:00",
  },
  {
    id: "conn-obsidian",
    label: "Obsidian 库",
    provider: "Obsidian",
    kind: "notes",
    status: "disconnected",
    description: "本地 Markdown 库索引；尚未配置 vault 路径。",
    updatedAt: "2026-05-18T11:00:00+08:00",
  },
  {
    id: "conn-mcp-fs",
    label: "MCP · 文件系统",
    provider: "MCP · filesystem",
    kind: "mcp",
    status: "connected",
    description: "通过 MCP 协议读取项目目录下的文档与代码文件。",
    updatedAt: "2026-05-24T09:15:00+08:00",
  },
  {
    id: "conn-mcp-git",
    label: "MCP · Git",
    provider: "MCP · git",
    kind: "mcp",
    status: "error",
    description: "Git 仓库 diff 与 blame 查询；上次连接因 SSH 密钥权限失败。",
    updatedAt: "2026-05-23T16:40:00+08:00",
  },
  {
    id: "conn-gdrive",
    label: "Google Drive",
    provider: "Google Drive",
    kind: "file",
    status: "disconnected",
    description: "云端文件读写；需 OAuth 授权后启用。",
    updatedAt: "2026-05-10T08:30:00+08:00",
  },
];

export const mockConnectorsEn: Connector[] = [
  {
    id: "conn-notion",
    label: "Notion workspace",
    provider: "Notion",
    kind: "notes",
    status: "connected",
    description:
      "Sync page index and task databases for Agent retrieval and citation.",
    updatedAt: "2026-05-25T14:22:00+08:00",
  },
  {
    id: "conn-obsidian",
    label: "Obsidian vault",
    provider: "Obsidian",
    kind: "notes",
    status: "disconnected",
    description: "Local Markdown vault index; vault path not configured yet.",
    updatedAt: "2026-05-18T11:00:00+08:00",
  },
  {
    id: "conn-mcp-fs",
    label: "MCP · filesystem",
    provider: "MCP · filesystem",
    kind: "mcp",
    status: "connected",
    description:
      "Read project documents and source files via the MCP filesystem server.",
    updatedAt: "2026-05-24T09:15:00+08:00",
  },
  {
    id: "conn-mcp-git",
    label: "MCP · git",
    provider: "MCP · git",
    kind: "mcp",
    status: "error",
    description:
      "Git diff and blame queries; last connection failed due to SSH key permissions.",
    updatedAt: "2026-05-23T16:40:00+08:00",
  },
  {
    id: "conn-gdrive",
    label: "Google Drive",
    provider: "Google Drive",
    kind: "file",
    status: "disconnected",
    description: "Cloud file read/write; requires OAuth authorization to enable.",
    updatedAt: "2026-05-10T08:30:00+08:00",
  },
];

export function getMockConnectors(locale: AshLocale): Connector[] {
  return locale === "en" ? mockConnectorsEn : mockConnectorsZh;
}
