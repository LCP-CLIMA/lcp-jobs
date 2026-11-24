import { describe, expect, it } from "vitest";
import { estimateLoad, type BtuInput } from "./btu";

const base = (): BtuInput => ({
  area: "25",
  length: "",
  width: "",
  height: "2.6",
  windows: [{ width: "1.2", height: "1.4", orientation: "S" }],
  insulation: "average",
  people: "2",
  kitchen: false,
  floor: "middle",
});

describe("Shkodër BTU guide", () => {
  it("recommends 12k for a modest average room", () => {
    const result = estimateLoad(base());
    expect(result.size).toBe("12k");
    expect(result.btu).toBeGreaterThan(9000);
    expect(result.btu).toBeLessThanOrEqual(12000);
  });

  it("steps up for a top-floor poorly insulated room with a west window", () => {
    const result = estimateLoad({
      ...base(),
      area: "32",
      insulation: "poor",
      floor: "top",
      kitchen: true,
      windows: [{ width: "2", height: "1.5", orientation: "W" }],
    });
    expect(["18k", "24k"]).toContain(result.size);
  });
});
