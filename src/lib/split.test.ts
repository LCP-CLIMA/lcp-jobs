import { describe, expect, it } from "vitest";
import { buildBackup, readBackup } from "./backup";
import { createInstallJob, defaultSettings } from "./defaults";
import { moneyTotals } from "./simple";
import { applyIndoorSize, detailLines, freshSingle, makeIndoor, pipesFor, setPipe, setRun, systemRollup } from "./split";
import type { OutdoorUnit, SplitSystem } from "./types";

function head(size: string, liquidM: string, vaporM: string, restM: string, liquid: "1/4" | "3/8" | "1/2" | "5/8" | "3/4", vapor: "1/4" | "3/8" | "1/2" | "5/8" | "3/4") {
  const settings = defaultSettings();
  let unit = makeIndoor(size, settings, restM, size + liquidM);
  unit = applyIndoorSize(unit, size, settings);
  unit = setPipe(unit, "liquid", liquid, settings);
  unit = setPipe(unit, "vapor", vapor, settings);
  unit = { ...unit, runM: restM, liquidM, vaporM, cable3M: restM, cable5M: restM, drainM: restM };
  return unit;
}

function outdoor(size: string, mount: "ground" | "wall", qty: string, price: string, indoors: ReturnType<typeof head>[]): OutdoorUnit {
  return { id: size, size, mount, mountQty: qty, mountPrice: price, indoors };
}

describe("multi split", () => {
  const settings = defaultSettings();

  it("fills the standard pipe pair for the indoor size", () => {
    expect(pipesFor("9k")).toEqual({ liquid: "1/4", vapor: "3/8" });
    expect(pipesFor("12k")).toEqual({ liquid: "1/4", vapor: "3/8" });
    expect(pipesFor("18k")).toEqual({ liquid: "1/4", vapor: "1/2" });
    expect(pipesFor("24k")).toEqual({ liquid: "3/8", vapor: "5/8" });
    const next = applyIndoorSize(makeIndoor("12k", settings, "3", "a"), "18k", settings);
    expect(next.liquid).toBe("1/4");
    expect(next.vapor).toBe("1/2");
    expect(next.liquidM).toBe("3");
  });

  it("keeps a length that was edited when the shared run changes", () => {
    const start = makeIndoor("12k", settings, "3", "a");
    const edited = setRun({ ...start, vaporM: "9" }, "4");
    expect(edited.liquidM).toBe("4");
    expect(edited.vaporM).toBe("9");
    expect(edited.cable3M).toBe("4");
  });

  it("prices the 2-outdoor test from the list", () => {
    const system: SplitSystem = {
      id: "job",
      kind: "multi",
      outdoors: [
        outdoor("42k", "wall", "2", "1500", [
          head("18k", "8", "8", "8", "1/4", "1/2"),
          head("18k", "6", "7", "6", "1/4", "1/2"),
          head("9k", "4", "4", "4", "1/4", "3/8"),
        ]),
        outdoor("27k", "ground", "1", "4000", [
          head("9k", "5", "5", "5", "1/4", "3/8"),
          head("9k", "3", "9", "3", "1/4", "3/8"),
          head("9k", "4", "4", "4", "3/8", "1/2"),
        ]),
      ],
    };
    expect(systemRollup([system]).sell).toBe(40730);
    const labels = detailLines([system]).map((line) => line.label);
    expect(labels.some((label) => label.includes("42k"))).toBe(true);
    expect(labels.some((label) => label.includes("27k"))).toBe(true);
    expect(labels.filter((label) => label.startsWith("Koka")).length).toBe(6);
  });

  it("starts a new offer as a 12k single split at 3 m", () => {
    const job = createInstallJob(settings);
    expect(job.money?.systems?.[0].kind).toBe("single");
    expect(job.money?.systems?.[0].outdoors[0].indoors[0].size).toBe("12k");
    expect(job.money?.systems?.[0].outdoors[0].indoors[0].runM).toBe("3");
    expect(systemRollup(job.money?.systems).sell).toBe(2790);
  });

  it("leaves an older quote unchanged until the details are edited", () => {
    const job = createInstallJob(settings);
    job.money = { ...job.money!, systems: undefined, unitSell: "125000", unitBuy: "88000" };
    const totals = moneyTotals(job.money);
    expect(totals.sell).toBe(125000);
    expect(totals.cost).toBe(88000);
    expect(freshSingle(settings).kind).toBe("single");
  });

  it("survives a backup", async () => {
    const job = createInstallJob(settings, "backup-split");
    job.customerName = "Multi";
    job.money = { ...job.money!, systems: [freshSingle(settings)] };
    const blob = await buildBackup({ jobs: [job], settings, photos: [], offers: [] });
    const restored = await readBackup(blob);
    expect(restored.jobs[0].money?.systems?.[0].kind).toBe("single");
    expect(restored.jobs[0].money?.systems?.[0].outdoors[0].indoors).toHaveLength(1);
  });
});
