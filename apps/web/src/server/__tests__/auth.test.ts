import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// server/auth imports "server-only" (throws outside a server bundle), the IAM
// client, and next/headers cookies. Stub all three for the unit test.
vi.mock("server-only", () => ({}));

const post = vi.fn();
vi.mock("@ash/iam-client", () => ({
  createIamClient: () => ({ POST: post }),
}));

// In-memory cookie jar backing next/headers. get/set/delete are spied so the
// test can assert whether the session was preserved or wiped.
const store = new Map<string, string>();
const cookieGet = vi.fn((name: string) => {
  const value = store.get(name);
  return value === undefined ? undefined : { name, value };
});
const cookieSet = vi.fn((name: string, value: string) => {
  store.set(name, value);
});
const cookieDelete = vi.fn((name: string) => {
  store.delete(name);
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet, set: cookieSet, delete: cookieDelete }),
}));

import { refreshAccessToken } from "@/server/auth";

const okToken = {
  access_token: "at-new",
  refresh_token: "rt-new",
  user_id: "u1",
  email: "a@b.c",
  role: "user" as const,
};

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("refreshAccessToken", () => {
  it("coalesces concurrent refreshes into a single IAM call and preserves the session", async () => {
    store.set("ash_refresh_token", "rt-old");
    // Model IAM refresh-token rotation: the first use of a token mints a new one
    // and invalidates the old; reusing an already-spent token is a 401. Without
    // single-flight, racing callers would burn the same token and the losers'
    // 401 would wipe the whole session.
    const used = new Set<string>();
    post.mockImplementation(async (_path: string, { body }: { body: { refresh_token: string } }) => {
      if (used.has(body.refresh_token)) {
        return { data: undefined, error: { error: "invalid_refresh_token" }, response: { status: 401 } };
      }
      used.add(body.refresh_token);
      return { data: okToken, error: undefined, response: { status: 200 } };
    });

    const results = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r?.id === "u1")).toBe(true);
    expect(cookieDelete).not.toHaveBeenCalled();
    expect(store.get("ash_refresh_token")).toBe("rt-new");
  });

  it("keeps the session on a transient IAM failure (5xx)", async () => {
    store.set("ash_refresh_token", "rt-old");
    post.mockResolvedValue({ data: undefined, error: { error: "server_error" }, response: { status: 503 } });

    const user = await refreshAccessToken();

    expect(user).toBeNull();
    expect(cookieDelete).not.toHaveBeenCalled();
    expect(store.get("ash_refresh_token")).toBe("rt-old");
  });

  it("keeps the session when the IAM call throws (network error)", async () => {
    store.set("ash_refresh_token", "rt-old");
    post.mockRejectedValue(new TypeError("fetch failed"));

    const user = await refreshAccessToken();

    expect(user).toBeNull();
    expect(cookieDelete).not.toHaveBeenCalled();
    expect(store.get("ash_refresh_token")).toBe("rt-old");
  });

  it("clears the session only when the refresh token is definitively invalid (401)", async () => {
    store.set("ash_refresh_token", "rt-dead");
    post.mockResolvedValue({ data: undefined, error: { error: "invalid_refresh_token" }, response: { status: 401 } });

    const user = await refreshAccessToken();

    expect(user).toBeNull();
    expect(cookieDelete).toHaveBeenCalledWith("ash_refresh_token");
    expect(store.has("ash_refresh_token")).toBe(false);
  });

  it("returns null without calling IAM when there is no refresh token", async () => {
    const user = await refreshAccessToken();

    expect(user).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});
