import type { AgentSkill } from "../types";
import type { AshLocale } from "./locale";

export const mockSkillsZh: AgentSkill[] = [
  {
    id: "skill-web-search",
    label: "网页搜索",
    category: "browse",
    description: "检索公开网页与新闻源，返回结构化摘要与引用链接。",
    enabled: true,
  },
  {
    id: "skill-web-read",
    label: "网页阅读",
    category: "browse",
    description: "抓取并解析指定 URL 的正文内容，支持长文分段摘要。",
    enabled: true,
  },
  {
    id: "skill-doc-write",
    label: "文档撰写",
    category: "write",
    description: "生成与修订 Markdown / 富文本文档，输出到 Workspace 产物区。",
    enabled: true,
  },
  {
    id: "skill-table-analyze",
    label: "表格分析",
    category: "data",
    description: "读取 CSV / 表格数据，执行基础统计与可视化建议。",
    enabled: true,
  },
  {
    id: "skill-code-execute",
    label: "代码执行",
    category: "code",
    description: "在隔离沙箱中运行 Python / Node 脚本（需 Phase 2 服务端支持）。",
    enabled: false,
    requiresPhase2: true,
  },
  {
    id: "skill-image-gen",
    label: "图像生成",
    category: "media",
    description: "调用图像模型生成配图与封面（需 Phase 2 服务端支持）。",
    enabled: false,
    requiresPhase2: true,
  },
  {
    id: "skill-long-search",
    label: "深度检索",
    category: "browse",
    description: "多轮检索与交叉验证，适用于竞品调研与合规比对场景。",
    enabled: true,
  },
];

export const mockSkillsEn: AgentSkill[] = [
  {
    id: "skill-web-search",
    label: "Web search",
    category: "browse",
    description:
      "Search public web and news sources; return structured summaries with citation links.",
    enabled: true,
  },
  {
    id: "skill-web-read",
    label: "Web read",
    category: "browse",
    description:
      "Fetch and parse page body content from a URL; supports chunked summaries for long articles.",
    enabled: true,
  },
  {
    id: "skill-doc-write",
    label: "Document writing",
    category: "write",
    description:
      "Draft and revise Markdown / rich-text documents; output to the Workspace artifacts pane.",
    enabled: true,
  },
  {
    id: "skill-table-analyze",
    label: "Table analysis",
    category: "data",
    description:
      "Ingest CSV / tabular data and run basic statistics with visualization suggestions.",
    enabled: true,
  },
  {
    id: "skill-code-execute",
    label: "Code execution",
    category: "code",
    description:
      "Run Python / Node scripts in an isolated sandbox (requires Phase 2 server support).",
    enabled: false,
    requiresPhase2: true,
  },
  {
    id: "skill-image-gen",
    label: "Image generation",
    category: "media",
    description:
      "Invoke image models for illustrations and covers (requires Phase 2 server support).",
    enabled: false,
    requiresPhase2: true,
  },
  {
    id: "skill-long-search",
    label: "Deep search",
    category: "browse",
    description:
      "Multi-round retrieval with cross-validation for competitive research and compliance checks.",
    enabled: true,
  },
];

export function getMockSkills(locale: AshLocale): AgentSkill[] {
  return locale === "en" ? mockSkillsEn : mockSkillsZh;
}
