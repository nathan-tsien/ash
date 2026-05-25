#!/usr/bin/env node
/**
 * Compare recursive key sets between zh and en next-intl message bundles.
 * Exits non-zero when keys diverge.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zhPath = join(root, "apps/web/messages/zh.json");
const enPath = join(root, "apps/web/messages/en.json");

/** @param {unknown} obj @param {string} [prefix] */
function collectKeys(obj, prefix = "") {
  /** @type {string[]} */
  const keys = [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return keys;
  }
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    keys.push(...collectKeys(value, path));
  }
  return keys;
}

const zh = JSON.parse(readFileSync(zhPath, "utf8"));
const en = JSON.parse(readFileSync(enPath, "utf8"));

const zhKeys = new Set(collectKeys(zh));
const enKeys = new Set(collectKeys(en));

const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k)).sort();

if (onlyZh.length === 0 && onlyEn.length === 0) {
  console.info("[i18n:check] zh.json and en.json keys match.");
  process.exit(0);
}

if (onlyZh.length > 0) {
  console.error("[i18n:check] Keys only in zh.json:");
  for (const key of onlyZh) {
    console.error(`  - ${key}`);
  }
}

if (onlyEn.length > 0) {
  console.error("[i18n:check] Keys only in en.json:");
  for (const key of onlyEn) {
    console.error(`  - ${key}`);
  }
}

process.exit(1);
