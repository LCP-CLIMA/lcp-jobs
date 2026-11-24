import { describe, expect, it } from "vitest";
import { exampleService, hitachiExample, profitExample } from "./defaults";
import { jobProfit, profitRows } from "./profit";

describe("profit and loss list", () => {
  it("orders every job by date and keeps a running total", () => {
    const rows = profitRows([exampleService(), profitExample(), hitachiExample()]);
    expect(rows.map((row) => row.id)).toEqual(["example-hitachi-12k", "example-profit-12k", "example-service-call"]);
    let running = 0;
    for (const row of rows) {
      running += row.profit;
      expect(row.running).toBeCloseTo(running, 5);
    }
    expect(rows[0].profit).toBeLessThan(0);
    expect(rows[1].profit).toBeGreaterThan(0);
    expect(rows[1].name).toContain("profit");
    expect(rows[2].kind).toBe("service");
    expect(rows.at(-1)?.running).toBeCloseTo(rows.reduce((sum, row) => sum + row.profit, 0), 5);
    expect(jobProfit(profitExample())).toBeGreaterThan(0);
  });
});
