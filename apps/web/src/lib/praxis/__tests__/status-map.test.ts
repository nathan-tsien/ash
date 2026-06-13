import { describe, expect, it } from "vitest";
import { praxisToAshStatus } from "../status-map";

describe("praxisToAshStatus", () => {
  it("maps every praxis status to an ash status", () => {
    expect(praxisToAshStatus("draft")).toBe("pending");
    expect(praxisToAshStatus("running")).toBe("running");
    expect(praxisToAshStatus("paused")).toBe("running");
    expect(praxisToAshStatus("awaiting_input")).toBe("awaiting_input");
    expect(praxisToAshStatus("completed")).toBe("completed");
    expect(praxisToAshStatus("failed")).toBe("failed");
    expect(praxisToAshStatus("cancelled")).toBe("failed");
  });
});
