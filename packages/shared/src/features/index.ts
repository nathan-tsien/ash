import type { FeatureDefinition } from "../types";

export const featureRegistry: FeatureDefinition[] = [
  {
    id: "core",
    label: "通用 Agent",
    description: "默认对话、Plan 与 Artifact 工作区",
    enabled: true,
  },
  {
    id: "office",
    label: "办公套件",
    description: "文档、表格、邮件自动化（即将推出）",
    enabled: false,
  },
  {
    id: "media",
    label: "自媒体运营",
    description: "选题、脚本、多平台内容生产（即将推出）",
    enabled: false,
  },
];

export function getFeature(id: string): FeatureDefinition | undefined {
  return featureRegistry.find((f) => f.id === id);
}
