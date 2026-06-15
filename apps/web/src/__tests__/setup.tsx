/// <reference types="vitest" />
import "@testing-library/jest-dom/vitest";

// jsdom lacks ResizeObserver; Radix ScrollArea (and others) reference it on mount.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock next-intl
// useTranslations returns "Namespace.key" by default (no provider), but when
// NextIntlClientProvider supplies messages the context overrides the stub so
// that tests using the real provider get real translated strings.
let _intlMessages: Record<string, Record<string, string>> = {};

vi.mock("next-intl", () => ({
  NextIntlClientProvider: ({
    messages,
    children,
  }: {
    locale?: string;
    messages?: Record<string, Record<string, string>>;
    children: React.ReactNode;
  }) => {
    if (messages) _intlMessages = messages;
    return <>{children}</>;
  },
  useTranslations: (namespace: string) => (key: string) => {
    const ns = _intlMessages[namespace];
    return ns?.[key] ?? `${namespace}.${key}`;
  },
}));

// Mock next-intl/navigation
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock gsap — track calls without animating
vi.mock("gsap", () => {
  const gsap = {
    to: vi.fn(),
    fromTo: vi.fn(),
    context: vi.fn((fn: () => void) => {
      fn();
      return { revert: vi.fn() };
    }),
    defaults: vi.fn(),
    matchMedia: vi.fn(() => ({ add: vi.fn() })),
    registerPlugin: vi.fn(),
  };
  return { default: gsap };
});

// Mock gsap/ScrollTrigger
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
}));

// Mock gsap-setup (side-effect import in components)
vi.mock("@/lib/animations/gsap-setup", () => ({}));

vi.mock("@gsap/react", () => ({
  useGSAP: vi.fn(),
}));

// Mock @ash/ui components
vi.mock("@ash/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@ash/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// Mock @ash/ui lib/utils
vi.mock("@ash/ui/lib/utils", () => ({
  cn: (...args: (string | undefined | false)[]) =>
    args.filter(Boolean).join(" "),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ArrowDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrow-down" {...props} />
  ),
  ArrowLeftRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrow-lr" {...props} />
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="check" {...props} />
  ),
  Copy: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="copy" {...props} />
  ),
  FolderPlus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="folder-plus" {...props} />
  ),
  Home: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="home" {...props} />
  ),
  ListTodo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="list-todo" {...props} />
  ),
  LogOut: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="log-out" {...props} />
  ),
  MessageSquarePlus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="msg-plus" {...props} />
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="search" {...props} />
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="settings" {...props} />
  ),
  SquarePlus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="square-plus" {...props} />
  ),
  Loader2: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="loader2" {...props} />
  ),
  MessageSquare: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="message-square" {...props} />
  ),
  PanelRightClose: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="panel-right-close" {...props} />
  ),
  PanelRightOpen: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="panel-right-open" {...props} />
  ),
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="sparkles" {...props} />
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="x" {...props} />
  ),
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrow-right" {...props} />
  ),
}));

// Mock highlight.js CSS import
vi.mock("highlight.js/styles/github-dark.css", () => ({}));

// Mock settings modal (heavy component tree)
vi.mock("@/components/settings/settings-modal", () => ({
  SettingsModal: () => null,
}));

// Mock cmdk — filtering is tested via the real cmdk in integration; here we stub subcomponents
vi.mock("cmdk", () => ({
  Command: Object.assign(
    ({
      children,
      onKeyDown,
      filter,
    }: {
      children: React.ReactNode;
      onKeyDown?: (e: React.KeyboardEvent) => void;
      filter?: (value: string, search: string) => number;
    }) => (
      <div
        data-cmdk-root=""
        onKeyDown={onKeyDown}
        data-filter={filter ? "custom" : undefined}
      >
        {children}
      </div>
    ),
    {
      Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input data-cmdk-input="" {...props} />
      ),
      List: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLDivElement>) => (
        <div data-cmdk-list="" {...props}>
          {children}
        </div>
      ),
      Empty: ({ children }: { children: React.ReactNode }) => (
        <div data-cmdk-empty="">{children}</div>
      ),
      Group: ({
        children,
        heading,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) => (
        <div data-cmdk-group="" {...props}>
          {heading && <div data-cmdk-group-heading="">{heading}</div>}
          {children}
        </div>
      ),
      Item: ({
        children,
        onSelect,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & {
        onSelect?: () => void;
        value?: string;
      }) => (
        <div data-cmdk-item="" onClick={onSelect} {...props}>
          {children}
        </div>
      ),
      Separator: (props: React.HTMLAttributes<HTMLDivElement>) => (
        <div data-cmdk-separator="" {...props} />
      ),
      // Mirrors cmdk's Command.Dialog (Radix Dialog wrapper): a sibling overlay
      // plus a role="dialog" content node carrying the inner cmdk-root. Closed
      // state renders nothing; Escape / overlay click drive onOpenChange(false).
      Dialog: ({
        open,
        onOpenChange,
        label,
        filter,
        children,
      }: {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        label?: string;
        filter?: (value: string, search: string) => number;
        children?: React.ReactNode;
      }) =>
        open ? (
          <div>
            <div {...{ "cmdk-overlay": "" }} onClick={() => onOpenChange?.(false)} />
            <div
              role="dialog"
              aria-label={label}
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange?.(false);
              }}
            >
              <div data-cmdk-root="" data-filter={filter ? "custom" : undefined}>
                {children}
              </div>
            </div>
          </div>
        ) : null,
    },
  ),
}));

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

// Mock remark-gfm and rehype-highlight
vi.mock("remark-gfm", () => ({ default: () => () => {} }));
vi.mock("rehype-highlight", () => ({ default: () => () => {} }));
