import { describe, expect, it } from "vitest";
import { emptyMoney, moneyTotals } from "./simple";

describe("selling price minus costs", () => {
  it("keeps VAT and shows about 18,333 profit on a 125,000 sale", () => {
    const totals = moneyTotals({
      ...emptyMoney(),
      unitBuy: "88000",
      matOther: "12000",
      extraTravel: "3000",
      sellingPrice: "125000",
      purchasesVat: true,
    });
    expect(totals.cost).toBe(103000);
    expect(totals.sell).toBe(125000);
    expect(totals.beforeVat).toBe(22000);
    expect(totals.vatToPay).toBeCloseTo(22000 / 6, 5);
    expect(totals.profit).toBeCloseTo(22000 / 1.2, 5);
    expect(Math.round(totals.profit)).toBe(18333);
    expect(totals.margin).toBeCloseTo(17.6, 5);
  });

  it("does not show a loss before a selling price is entered, and ignores an unpaid wage", () => {
    const totals = moneyTotals({ ...emptyMoney(), unitBuy: "88000", extraHelper: "10000", payWage: false });
    expect(totals.hasSell).toBe(false);
    expect(totals.profit).toBe(0);
    expect(totals.cost).toBe(88000);
  });
});
