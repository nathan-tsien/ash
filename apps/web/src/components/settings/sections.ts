export type SettingsSectionId =
  | "account"
  | "general"
  | "billing"
  | "personalization"
  | "scheduled-tasks"
  | "skills"
  | "connectors";

export const SETTINGS_SECTIONS_ORDER: SettingsSectionId[] = [
  "account",
  "general",
  "billing",
  "personalization",
  "scheduled-tasks",
  "skills",
  "connectors",
];

export const SETTINGS_SECTION_GROUPS: Array<{
  id: "account" | "features";
  items: SettingsSectionId[];
}> = [
  { id: "account", items: ["account", "general", "billing", "personalization"] },
  { id: "features", items: ["scheduled-tasks", "skills", "connectors"] },
];
