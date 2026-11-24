import { describe, expect, it } from "vitest";
import { blankChargeReading, evaluateReading, saturationC } from "./charge";
import type { ChargeReading } from "./types";

function reading(partial: Partial<ChargeReading>): ChargeReading {
  return { ...blankChargeReading(), ...partial };
}

describe("system charge check", () => {
  it("reads saturation from the built-in table in celsius", () => {
    expect(saturationC("R32", 7.12)).toBeCloseTo(0, 1);
    expect(saturationC("R410A", 15.54)).toBeCloseTo(25, 1);
    expect(saturationC("R22", 3.97)).toBeCloseTo(0, 1);
  });

  it("flags high superheat, low subcooling and low suction as undercharge", () => {
    const result = evaluateReading(reading({
      refrigerant: "R32",
      mode: "cooling",
      metering: "exv",
      pressureUnit: "bar",
      suctionPressure: "4.79",
      liquidPressure: "23.79",
      suctionTemp: "6",
      liquidTemp: "39",
      returnAir: "24",
      supplyAir: "15",
      outdoorAmbient: "32",
    }));
    expect(result.evapSat).toBeCloseTo(-10, 1);
    expect(result.superheat).toBeCloseTo(16, 1);
    expect(result.subcooling).toBeCloseTo(1, 1);
    expect(result.findings.some((item) => item.id === "undercharge")).toBe(true);
    expect(result.customerText).toContain("Shpjegim për klientin");
    expect(result.techSummary + result.customerText).not.toMatch(/°F|Fahrenheit|Kelvin/);
  });

  it("flags low superheat, high subcooling and high head as overcharge", () => {
    const result = evaluateReading(reading({
      refrigerant: "R32",
      mode: "cooling",
      metering: "exv",
      suctionPressure: "10.09",
      liquidPressure: "30.39",
      suctionTemp: "11",
      liquidTemp: "35",
      returnAir: "25",
      supplyAir: "15",
      outdoorAmbient: "30",
    }));
    expect(result.superheat).toBeLessThan(4);
    expect(result.subcooling).toBeGreaterThan(11);
    expect(result.findings.some((item) => item.id === "overcharge")).toBe(true);
  });

  it("flags high superheat and high subcooling as a restriction", () => {
    const result = evaluateReading(reading({
      refrigerant: "R32",
      mode: "cooling",
      metering: "txv",
      suctionPressure: "7.12",
      liquidPressure: "23.79",
      suctionTemp: "18",
      liquidTemp: "22",
      returnAir: "24",
      supplyAir: "14",
      outdoorAmbient: "30",
    }));
    expect(result.findings.some((item) => item.id === "restriction")).toBe(true);
  });
});
