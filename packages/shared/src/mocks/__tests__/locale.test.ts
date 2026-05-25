import { describe, expect, it } from "vitest";
import { ASH_LOCALES, bcp47Locale, isAshLocale } from "../locale";

describe("locale helpers", () => {
  it("recognizes supported ash locales", () => {
    expect(isAshLocale("zh")).toBe(true);
    expect(isAshLocale("en")).toBe(true);
    expect(isAshLocale("fr")).toBe(false);
  });

  it("maps ash locales to BCP-47 tags", () => {
    expect(bcp47Locale("zh")).toBe("zh-CN");
    expect(bcp47Locale("en")).toBe("en-US");
  });

  it("lists canonical locale ids", () => {
    expect(ASH_LOCALES).toEqual(["zh", "en"]);
  });
});
