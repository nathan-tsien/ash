import { describe, expect, it } from "vitest";
import { fakePraxisClient } from "../fake-client";

describe("fakePraxisClient.listTasks", () => {
  it("returns a seeded first page with a cursor, then the final page", async () => {
    const p1 = await fakePraxisClient.listTasks({ limit: 2 });
    expect(p1.items.length).toBeGreaterThan(0);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await fakePraxisClient.listTasks({ limit: 2, cursor: p1.next_cursor! });
    expect(p2.next_cursor === null || typeof p2.next_cursor === "string").toBe(true);
  });

  it("getTask returns a summary for a seeded id", async () => {
    const page = await fakePraxisClient.listTasks({ limit: 50 });
    const id = page.items[0].id;
    const summary = await fakePraxisClient.getTask(id);
    expect(summary.id).toBe(id);
  });
});
