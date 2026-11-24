import { describe, expect, it } from "vitest";
import { breakEvenBySize, compute, qtyOf } from "./calc";
import { hitachiExample, profitExample } from "./defaults";
import { signedLek, toneOf } from "./format";

describe("install calculator", () => {
  const job = hitachiExample();
  const result = compute(job);

  it("keeps the Hitachi example at about −4,834 Lek", () => {
    expect(Math.round(result.net)).toBe(-4834);
    expect(signedLek(result.net).tone).toBe("neg");
    expect(signedLek(result.net).text.startsWith("−")).toBe(true);
  });

  it("break-even packages round to 26,301 / 29,166 / 31,596, within 1 Lek of the stated figures", () => {
    const rows = breakEvenBySize(job, result);
    expect(rows.map((r) => Math.round(r.breakEven))).toEqual([26301, 29166, 31596]);
    expect(Math.abs(rows[0].breakEven - 26302)).toBeLessThan(1);
    expect(Math.abs(rows[1].breakEven - 29167)).toBeLessThan(1);
    expect(Math.abs(rows[2].breakEven - 31597)).toBeLessThan(1);
  });

  it("adds 390 Lek to each break-even package for the second cable", () => {
    const oneCable = {
      ...job,
      materials: job.materials.map((row) => (row.id === "m6" ? { ...row, qty: "0" } : row)),
    };
    const both = breakEvenBySize(job, compute(job));
    const single = breakEvenBySize(oneCable, compute(oneCable));
    for (let i = 0; i < 3; i++) expect(both[i].breakEven - single[i].breakEven).toBeCloseTo(390, 4);
  });

  it("prices trunking at 700 Lek/m and counts 1–2 m as 3 m", () => {
    const trunk = result.breakdown.find((b) => b.label.startsWith("Trunking"));
    expect(trunk?.gross).toBe(3300);
    const short = compute({
      ...job,
      trunk: job.trunk.map((row) => (row.id === "t1" ? { ...row, qty: "1" } : row)),
    });
    expect(short.breakdown.find((b) => b.label.startsWith("Trunking"))?.gross).toBe(3300);
    expect(qtyOf({ id: "t1", name: "", qty: "0", price: "700", vat: true })).toBe(0);
    expect(qtyOf({ id: "t1", name: "", qty: "4", price: "700", vat: true })).toBe(4);
  });

  it("does not deduct VAT on van wear", () => {
    const transport = result.breakdown.find((b) => b.label.startsWith("Transport"));
    expect(transport?.gross).toBeCloseTo(429.6, 5);
    expect(transport?.vat).toBeCloseTo(53.6, 5);
  });

  it("leaves depreciation out until the toggle is on", () => {
    const on = compute({ ...job, inclFixed: true });
    expect(on.costReal - result.costReal).toBeCloseTo(20 * 3.7, 5);
    const transport = on.breakdown.find((b) => b.label.startsWith("Transport"));
    expect(transport?.vat).toBeCloseTo(53.6, 5);
  });

  it("leaves older jobs unchanged and drops a line only when it is switched off", () => {
    const base = compute(job);
    expect(compute({ ...job, includeLabor: false }).costReal).toBeLessThan(base.costReal);
    const withoutCable = compute({
      ...job,
      materials: job.materials.map((row) => (row.id === "m6" ? { ...row, enabled: false } : row)),
    });
    expect(base.costGross - withoutCable.costGross).toBeCloseTo(390, 4);
  });

  it("shows a profit in green when the selling price is above cost", () => {
    const profit = compute(profitExample());
    expect(profit.net).toBeGreaterThan(0);
    expect(toneOf(profit.net)).toBe("pos");
    expect(signedLek(0)).toEqual({ text: "0 Lek", tone: "zero" });
  });
});
