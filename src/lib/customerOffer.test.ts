import { describe, expect, it } from "vitest";
import { jobCustomerView } from "./customerOffer";
import { createInstallJob, defaultSettings } from "./defaults";
import { parseDateInput } from "./format";
import { emptyMoney } from "./simple";

describe("customer offer", () => {
  it("shows 125,000 including VAT and no buy price", () => {
    const job = createInstallJob(defaultSettings());
    job.customerName = "Test 24k";
    job.brand = "Haier";
    job.model = "Pearl";
    job.date = "2026-11-25";
    job.money = {
      ...emptyMoney(),
      size: "24k",
      unitBuy: "88000",
      unitSell: "125000",
      matPipes: "12000",
      extraTravel: "3000",
    };
    const view = jobCustomerView(job, defaultSettings());
    expect(view.total).toBe(125000);
    expect(view.date).toBe("25/11/2026");
    expect(view.description).toBe("Kondicioner Inverter 24000 BTU, Haier Pearl");
    expect(view.lines.some((line) => line.label.includes("Inverter"))).toBe(true);
    expect(view.lines.some((line) => line.label.includes("Abonim"))).toBe(true);
    expect(JSON.stringify(view)).not.toContain("88000");
    expect(JSON.stringify(view)).not.toContain("12000");
  });

  it("reads a date as DD/MM/YYYY", () => {
    expect(parseDateInput("25/11/2026")).toBe("2026-11-25");
    expect(parseDateInput("5.1.2026")).toBe("2026-01-05");
    expect(parseDateInput("31/02/2026")).toBeNull();
  });
});
