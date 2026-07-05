import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthLayout from "@/app/(workbench)/(auth)/layout";
import { MarketingFooter } from "../marketing-footer";
import { MarketingHeader } from "../marketing-header";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("zh"),
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const messages: Record<string, string> = {
        tagline: "私人秘书",
        columnProduct: "产品",
        linkFeatures: "功能",
        linkShowcase: "案例",
        linkPricing: "价格",
        columnResources: "资源",
        docsHub: "文档",
        ghPlaceholder: "GitHub",
        copyright: "保留所有权利",
        privacy: "隐私",
        terms: "条款",
      };

      return messages[key] ?? key;
    }),
}));

describe("brand logo surfaces", () => {
  it("uses LogoMark in the marketing header brand link", () => {
    const { container } = render(<MarketingHeader />);

    const brandLink = screen.getByLabelText("Header.logoAria");
    expect(brandLink.querySelector('[data-slot="logo-mark"]')).toBeInTheDocument();
    expect(brandLink.querySelector('[data-testid="sparkles"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="wordmark"]')).toBeInTheDocument();
  });

  it("uses LogoMark in the marketing footer brand link", async () => {
    const { container } = render(await MarketingFooter());

    const brandLink = screen.getByRole("link", { name: /ash/i });
    expect(brandLink.querySelector('[data-slot="logo-mark"]')).toBeInTheDocument();
    expect(brandLink.querySelector('[data-testid="sparkles"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="wordmark"]')).toBeInTheDocument();
  });

  it("uses LogoMark on auth pages beside the wordmark", () => {
    const { container } = render(
      <AuthLayout>
        <form aria-label="auth-form" />
      </AuthLayout>,
    );

    expect(container.querySelector('[data-slot="logo-mark"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="wordmark"]')).toBeInTheDocument();
  });
});
