/**
 * Tests for workbench-sidebar fixes:
 *   A1 — "+ New task" link href must be "/app" (not "/")
 *   A2 — Task and Project sections each get their own bounded scroll region;
 *        footer remains visible with many tasks.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// next-intl is already mocked in setup.tsx — the stub returns "Namespace.key"
// but the workbench-home test overrides it; we rely on the setup default here.

// @/i18n/navigation must expose both Link and useRouter.
// The global setup only stubs useRouter; add Link so the component renders.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Heavy providers used by WorkbenchSidebar
vi.mock("@/components/settings/settings-modal-provider", () => ({
  useSettingsModal: () => ({ openSettings: vi.fn() }),
}));
vi.mock("@/components/command-palette/command-palette-provider", () => ({
  useCommandPalette: () => ({ openPalette: vi.fn() }),
}));
// Footer mounts auth context — stub it out so tests don't need the full auth tree.
vi.mock("../footer-account", () => ({ FooterAccount: () => <div data-testid="footer-account" /> }));

// Stub the in-app locale switcher (cookie-routed app zone) — its internals
// (Globe icon, locale cookie action) are out of scope for the sidebar layout test.
vi.mock("../app-locale-switcher", () => ({ AppLocaleSwitcher: () => <div data-testid="app-locale-switcher" /> }));

// Wordmark is a brand mark package; stub to avoid bundling issues
vi.mock("@ash/ui/wordmark", () => ({ Wordmark: () => <span>Ash</span> }));

vi.mock("@ash/ui/logo-mark", () => ({
  LogoMark: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="ash-logo-mark" {...props} />
  ),
}));

// Stub lucide icons referenced in the sidebar not covered by setup.tsx
// (setup.tsx already mocks lucide-react; extend it here with sidebar-specific icons.)
vi.mock("lucide-react", () => ({
  ChevronLeft: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-left" {...props} />,
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-right" {...props} />,
  Plus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="plus" {...props} />,
  Folder: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="folder" {...props} />,
  Search: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="search" {...props} />,
  Settings: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="settings" {...props} />,
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="sparkles" {...props} />,
  Globe: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="globe" {...props} />,
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-down" {...props} />,
}));

// Stub @ash/ui components used in sidebar sections
vi.mock("@ash/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

vi.mock("@ash/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@ash/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@ash/ui/status-dot", () => ({
  StatusDot: () => <span data-testid="status-dot" />,
}));

vi.mock("@ash/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Stub task-status helpers to avoid deep imports
vi.mock("@/lib/task-status", () => ({
  taskStatusSortRank: () => 0,
  taskStatusDotVariant: () => "idle",
  taskStatusIsLive: () => false,
  taskStatusLabelKey: () => "statusCompleted",
  taskStatusChipClass: () => "",
}));

vi.mock("@/lib/workbench-href", () => ({
  taskHref: (id: string) => `/app/tasks/${id}`,
  projectHref: (id: string) => `/app/projects/${id}`,
}));

vi.mock("@/lib/layout-constants", () => ({
  PANE_WIDTH: { rail: 56, sidebar: 240 },
}));

import { WorkbenchSidebar } from "../workbench-sidebar";
import type { Task, Project } from "@ash/shared";

/** Build a minimal Task fixture. */
function makeTask(id: string): Task {
  return { id, title: `Task ${id}`, status: "completed" } as Task;
}

/** Build a minimal Project fixture. */
function makeProject(id: string): Project {
  return { id, name: `Project ${id}`, tasks: [] } as unknown as Project;
}

const BASE_PROPS = {
  locale: "zh" as const,
  tasks: [],
  projects: [],
  viewMode: "home" as const,
};

describe("brand chrome", () => {
  it("uses the Ash logo mark for the sidebar home link", () => {
    render(<WorkbenchSidebar {...BASE_PROPS} />);

    const homeLink = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("aria-label")?.includes("sidebarHomeAria"));

    expect(homeLink).toBeDefined();
    expect(homeLink?.querySelector('[data-testid="ash-logo-mark"]')).toBeInTheDocument();
    expect(homeLink?.querySelector('[data-testid="sparkles"]')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// A1 — New-task link href
// ---------------------------------------------------------------------------
describe("A1: new-task affordances link to /app", () => {
  it('expanded "+ New task" button links to /app', () => {
    render(<WorkbenchSidebar {...BASE_PROPS} />);
    // There may be multiple links; find by text content
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.textContent?.includes("newTask") || el.getAttribute("href") === "/");

    // The button labelled "Workbench.newTask" in the expanded area must point to /app
    const newTaskLinks = screen
      .getAllByRole("link")
      .filter((el) =>
        el.textContent?.includes("Workbench.newTask") ||
        el.textContent?.includes("newTask"),
      );

    // At least one "new task" link must exist
    expect(newTaskLinks.length).toBeGreaterThanOrEqual(1);

    // None of the new-task links should point to "/" (the marketing home)
    const wrongLinks = newTaskLinks.filter((el) => el.getAttribute("href") === "/");
    expect(wrongLinks).toHaveLength(0);

    // All new-task links should point to /app
    const correctLinks = newTaskLinks.filter((el) => el.getAttribute("href") === "/app");
    expect(correctLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("collapsed-rail plus icon links to /app", () => {
    render(<WorkbenchSidebar {...BASE_PROPS} />);
    // The collapsed rail is initially hidden (opacity:0, visibility:hidden) so we
    // must query including hidden elements.  The Link inside it carries aria-label.
    const railLink = screen
      .getAllByRole("link", { hidden: true })
      .find((el) => el.getAttribute("aria-label")?.includes("newTask"));

    // Rail icon link should point to /app, not "/"
    expect(railLink).toBeDefined();
    expect(railLink?.getAttribute("href")).toBe("/app");
  });
});

// ---------------------------------------------------------------------------
// A2 — Independent scroll regions + footer pinned
// ---------------------------------------------------------------------------
describe("A2: independent scroll regions and pinned footer", () => {
  it("renders two independent ScrollArea containers when there are tasks and projects", () => {
    const tasks = Array.from({ length: 20 }, (_, i) => makeTask(String(i)));
    const projects = Array.from({ length: 5 }, (_, i) => makeProject(String(i)));

    render(<WorkbenchSidebar {...BASE_PROPS} tasks={tasks} projects={projects} />);

    // There should be at least 2 scroll areas (one for tasks, one for projects)
    const scrollAreas = screen.getAllByTestId("scroll-area");
    expect(scrollAreas.length).toBeGreaterThanOrEqual(2);
  });

  it("footer is always rendered regardless of task count", () => {
    const tasks = Array.from({ length: 50 }, (_, i) => makeTask(String(i)));

    render(<WorkbenchSidebar {...BASE_PROPS} tasks={tasks} />);

    expect(screen.getByTestId("footer-account")).toBeInTheDocument();
  });

  it("all tasks are rendered (no silent 10-item cap) when there are many tasks", () => {
    const tasks = Array.from({ length: 15 }, (_, i) => makeTask(String(i)));

    render(<WorkbenchSidebar {...BASE_PROPS} tasks={tasks} />);

    // Each task should appear as a link
    for (let i = 0; i < 15; i++) {
      expect(screen.getByText(`Task ${i}`)).toBeInTheDocument();
    }
  });

  it("project section is present even with many tasks", () => {
    const tasks = Array.from({ length: 50 }, (_, i) => makeTask(String(i)));
    const projects = [makeProject("alpha"), makeProject("beta")];

    render(<WorkbenchSidebar {...BASE_PROPS} tasks={tasks} projects={projects} />);

    expect(screen.getByText("Project alpha")).toBeInTheDocument();
    expect(screen.getByText("Project beta")).toBeInTheDocument();
  });
});
