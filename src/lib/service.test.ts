import { describe, expect, it } from "vitest";
import { createServiceJob, defaultSettings, exampleService } from "./defaults";
import { chargeableBlocks, serviceCompute } from "./service";
import type { ServiceJob } from "./types";

function job(partial: Partial<ServiceJob> = {}): ServiceJob {
  return { ...createServiceJob(defaultSettings(), "svc-test"), ...partial, kind: "service" };
}

describe("service call", () => {
  it("uses the approved call-out on the sample visit inside the 15 km zone", () => {
    const settings = defaultSettings();
    expect(settings.callOut).toBe("4000");
    expect(settings.halfHour).toBe("2000");
    expect(settings.freeKm).toBe("15");
    expect(settings.perExtraKm).toBe("30");
    const c = serviceCompute(exampleService());
    expect(c.blocks).toBe(1);
    expect(c.extraKm).toBe(0);
    expect(c.sell).toBe(6000);
    expect(c.transportGross).toBeCloseTo(429.6, 5);
    expect(c.transportVat).toBeCloseTo(53.6, 5);
    expect(Math.round(c.net)).toBe(4624);
  });

  it("bills started 30-minute blocks after the first hour", () => {
    expect(chargeableBlocks(0)).toBe(0);
    expect(chargeableBlocks(60)).toBe(0);
    expect(chargeableBlocks(61)).toBe(1);
    expect(chargeableBlocks(90)).toBe(1);
    expect(chargeableBlocks(91)).toBe(2);
    expect(chargeableBlocks(120)).toBe(2);
    const c = serviceCompute(job({ km: "0", minutes: "75", callOut: "0", halfHour: "2000", materials: [] }));
    expect(c.blocks).toBe(1);
    expect(c.timeCharge).toBe(2000);
    expect(c.sell).toBe(2000);
    expect(Math.round(c.net)).toBe(1667);
  });

  it("bills 30 Lek for each round-trip km beyond 15 km one way", () => {
    const within = serviceCompute(job({ km: "15", minutes: "40", materials: [] }));
    expect(within.extraKm).toBe(0);
    expect(within.sell).toBe(4000);
    const beyond = serviceCompute(job({ km: "20", minutes: "40", materials: [] }));
    expect(beyond.extraKm).toBe(10);
    expect(beyond.kmCharge).toBe(300);
    expect(beyond.sell).toBe(4300);
  });

  it("charges only the visit until the repair is accepted, then deducts that visit fee", () => {
    const shared = {
      km: "20",
      minutes: "30",
      materials: [{ id: "p", name: "Filter", qty: "1", price: "1000", vat: true }],
      repairPrice: "8000",
      refG: "0",
    };
    const declined = serviceCompute(job({ ...shared, repairAccepted: false }));
    expect(declined.visitFee).toBe(4300);
    expect(declined.sell).toBe(4300);
    const accepted = serviceCompute(job({ ...shared, repairAccepted: true }));
    expect(accepted.visitCredit).toBe(4300);
    expect(accepted.sell).toBe(9000);
  });

  it("passes materials and gas through without changing profit when the repair is accepted", () => {
    const bare = serviceCompute(job({ km: "0", callOut: "0", halfHour: "0", materials: [], refG: "0", repairAccepted: true, repairPrice: "0" }));
    const withParts = serviceCompute(
      job({
        km: "0",
        callOut: "0",
        halfHour: "0",
        repairAccepted: true,
        repairPrice: "0",
        materials: [{ id: "p", name: "Filter", qty: "2", price: "500", vat: true }],
        refG: "100",
      }),
    );
    expect(withParts.sell - bare.sell).toBeCloseTo(1000 + 125, 5);
    expect(withParts.net).toBeCloseTo(bare.net, 4);
  });

  it("keeps wear out of deductible VAT", () => {
    const c = serviceCompute(job({ km: "10", materials: [] }));
    expect(c.transportVat).toBeCloseTo((20 * 0.08 * 201) / 6, 5);
    expect(c.transportGross - 20 * 0.08 * 201).toBeCloseTo(20 * 5.4, 5);
  });
});
