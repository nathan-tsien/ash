import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Override the global next/navigation mock (src/__tests__/setup.tsx) with a
// stable `push` we can assert on and a controllable `callbackUrl` search param.
const push = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
}));

// The form awaits useAuth().login before navigating; resolve immediately.
const login = vi.fn().mockResolvedValue(undefined);
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ login }),
}));

import { LoginForm } from "../login-form";

function submit() {
  fireEvent.change(screen.getByLabelText("Auth.emailLabel"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Auth.passwordLabel"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByText("Auth.loginAction"));
}

describe("LoginForm post-login redirect", () => {
  beforeEach(() => {
    push.mockClear();
    login.mockClear();
    searchParams = new URLSearchParams();
  });

  it("navigates to a non-prefixed /app by default (the /zh/app 404 bug)", async () => {
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("honors a safe relative callbackUrl", async () => {
    searchParams = new URLSearchParams("callbackUrl=%2Fc%2Fconv-1");
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/c/conv-1"));
  });

  it("rejects an absolute (open-redirect) callbackUrl and falls back to /app", async () => {
    searchParams = new URLSearchParams("callbackUrl=https://evil.example/x");
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("rejects a protocol-relative (//) callbackUrl and falls back to /app", async () => {
    searchParams = new URLSearchParams("callbackUrl=//evil.example/x");
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("rejects a backslash open-redirect (/\\evil.com) and falls back to /app", async () => {
    searchParams = new URLSearchParams("callbackUrl=/\\evil.com");
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });

  it("rejects a double-backslash open-redirect (/\\/evil.com) and falls back to /app", async () => {
    searchParams = new URLSearchParams("callbackUrl=/\\/evil.com");
    render(<LoginForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
  });
});
