import { describe, expect, it } from "vitest";
import { emptyMoney, moneyTotals } from "./simple";

describe("selling price minus costs", () => {
  it("turns 88,000 + 12,000 + 3,000 against a 125,000 sale into 22,000 profit", () => {
    const totals = moneyTotals({
      ...emptyMoney(),
      unitBuy: "88000",
      matOther: "12000",
      extraTravel: "3000",
      sellingPrice: "125000",
    });
    expect(totals.cost).toBe(103000);
    expect(totals.sell).toBe(125000);
    expect(totals.profit).toBe(22000);
    expect(totals.margin).toBeCloseTo(17.6, 5);
  });

  it("does not add any cost that is not on the form", () => {
    const totals = moneyTotals({ ...emptyMoney(), sellingPrice: "50000" });
    expect(totals.cost).toBe(0);
    expect(totals.profit).toBe(50000);
  });
});
