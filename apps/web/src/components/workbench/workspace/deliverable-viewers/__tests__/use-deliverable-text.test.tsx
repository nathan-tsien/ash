import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeliverableText } from "../use-deliverable-text";

afterEach(() => vi.restoreAllMocks());

describe("useDeliverableText", () => {
  it("fetches text via the proxied href", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("hello", { status: 200 })));
    const { result } = renderHook(() => useDeliverableText("/v1/tasks/t/attachments/a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.text).toBe("hello");
    expect(result.current.error).toBeNull();
    expect((fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("/api/praxis/v1/tasks/t/attachments/a", expect.objectContaining({ signal: expect.anything() }));
  });
  it("surfaces a non-ok response as error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    const { result } = renderHook(() => useDeliverableText("/v1/tasks/t/attachments/a"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.text).toBeNull();
  });
});
