import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

const routerPush = vi.fn();
const setLocaleCookie = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/pricing",
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/app/(workbench)/locale-actions", () => ({
  setLocaleCookie: (locale: string) => setLocaleCookie(locale),
}));

import { LocaleSwitcher } from "../locale-switcher";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

const messages = {
  LocaleSwitcher: {
    ariaLabel: "Change interface locale",
    zh: "中文",
    en: "English",
  },
};

describe("LocaleSwitcher", () => {
  it("persists the shared app locale before navigating localized marketing paths", async () => {
    render(
      <NextIntlClientProvider locale="zh" messages={messages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByLabelText("Change interface locale"));
    await user.click(await screen.findByText("English"));

    await waitFor(() => expect(setLocaleCookie).toHaveBeenCalledWith("en"));
    expect(routerPush).toHaveBeenCalledWith("/pricing", { locale: "en" });
  });
});
