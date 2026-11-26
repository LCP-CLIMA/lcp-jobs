import { num } from "./format";
import type { IndoorUnit, JobMoney, OutdoorUnit, Pipe, Settings, SplitSystem } from "./types";

export const INDOOR_SIZES = ["9k", "12k", "18k", "24k"] as const;
export const OUTDOOR_SIZES = ["9k", "12k", "18k", "24k", "27k", "36k", "42k"] as const;
export const LINE_PIPES: Pipe[] = ["1/4", "3/8", "1/2", "5/8", "3/4"];

/** Standard pairs. Other sizes keep whatever is already chosen. */
export function pipesFor(size: string): { liquid: Pipe; vapor: Pipe } | null {
  if (size === "9k" || size === "12k") return { liquid: "1/4", vapor: "3/8" };
  if (size === "18k") return { liquid: "1/4", vapor: "1/2" };
  if (size === "24k") return { liquid: "3/8", vapor: "5/8" };
  return null;
}

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeIndoor(size: string, settings: Settings, meters = "3", id = nid("in")): IndoorUnit {
  const pipes = pipesFor(size) ?? { liquid: "1/4" as Pipe, vapor: "3/8" as Pipe };
  return {
    id,
    size,
    liquid: pipes.liquid,
    vapor: pipes.vapor,
    runM: meters,
    liquidM: meters,
    vaporM: meters,
    cable3M: meters,
    cable5M: meters,
    drainM: meters,
    liquidPrice: settings.pipe[pipes.liquid] ?? "",
    vaporPrice: settings.pipe[pipes.vapor] ?? "",
    cable3Price: settings.cable3,
    cable5Price: settings.cable5,
    drainPrice: settings.drain,
  };
}

export function makeOutdoor(size: string, settings: Settings, meters = "3", id = nid("out")): OutdoorUnit {
  return {
    id,
    size,
    mount: "wall",
    mountQty: "1",
    mountPrice: "",
    indoors: [makeIndoor(size, settings, meters)],
  };
}

/** New offer: single split, 12k, 3 m, list prices. */
export function freshSingle(settings: Settings): SplitSystem {
  return { id: nid("sys"), kind: "single", outdoors: [makeOutdoor("12k", settings, "3")] };
}

/** Older quotes have no system list. Open them as one single split with 0 m so the total stays put. */
export function migratedSingle(size: string, settings: Settings, id = "saved"): SplitSystem {
  const picked = size || "12k";
  return {
    id: `sys-${id}`,
    kind: "single",
    outdoors: [{ ...makeOutdoor(picked, settings, "0", `out-${id}`), indoors: [makeIndoor(picked, settings, "0", `in-${id}`)] }],
  };
}

export function applyIndoorSize(unit: IndoorUnit, size: string, settings: Settings): IndoorUnit {
  const pipes = pipesFor(size);
  if (!pipes) return { ...unit, size };
  return {
    ...unit,
    size,
    liquid: pipes.liquid,
    vapor: pipes.vapor,
    liquidPrice: settings.pipe[pipes.liquid] ?? "",
    vaporPrice: settings.pipe[pipes.vapor] ?? "",
  };
}

export function setPipe(unit: IndoorUnit, side: "liquid" | "vapor", pipe: Pipe, settings: Settings): IndoorUnit {
  const price = settings.pipe[pipe] ?? "";
  if (side === "liquid") return { ...unit, liquid: pipe, liquidPrice: price };
  return { ...unit, vapor: pipe, vaporPrice: price };
}

/** Lengths that still match the shared run move with it. Edited ones stay. */
export function setRun(unit: IndoorUnit, meters: string): IndoorUnit {
  const prev = unit.runM;
  const follow = (value: string) => (value === prev ? meters : value);
  return {
    ...unit,
    runM: meters,
    liquidM: follow(unit.liquidM),
    vaporM: follow(unit.vaporM),
    cable3M: follow(unit.cable3M),
    cable5M: follow(unit.cable5M),
    drainM: follow(unit.drainM),
  };
}

export function resizeSingle(system: SplitSystem, size: string, settings: Settings): SplitSystem {
  const outdoor = system.outdoors[0] ?? makeOutdoor(size, settings);
  const indoor = outdoor.indoors[0] ?? makeIndoor(size, settings);
  return {
    ...system,
    kind: "single",
    outdoors: [{ ...outdoor, size, indoors: [applyIndoorSize(indoor, size, settings)] }],
  };
}

export function setKind(system: SplitSystem, kind: "single" | "multi", settings: Settings): SplitSystem {
  if (kind === "single") return resizeSingle(system, system.outdoors[0]?.indoors[0]?.size || system.outdoors[0]?.size || "12k", settings);
  const outdoor = system.outdoors[0] ?? makeOutdoor("12k", settings);
  return { ...system, kind: "multi", outdoors: [{ ...outdoor, indoors: outdoor.indoors.length ? outdoor.indoors : [makeIndoor("12k", settings)] }] };
}

function patchOutdoor(systems: SplitSystem[], s: number, o: number, fn: (outdoor: OutdoorUnit) => OutdoorUnit): SplitSystem[] {
  return systems.map((system, si) => si === s
    ? { ...system, outdoors: system.outdoors.map((outdoor, oi) => oi === o ? fn(outdoor) : outdoor) }
    : system);
}

export function patchIndoor(systems: SplitSystem[], s: number, o: number, i: number, fn: (unit: IndoorUnit) => IndoorUnit): SplitSystem[] {
  return patchOutdoor(systems, s, o, (outdoor) => ({
    ...outdoor,
    indoors: outdoor.indoors.map((unit, ii) => ii === i ? fn(unit) : unit),
  }));
}

export function addIndoor(systems: SplitSystem[], s: number, o: number, settings: Settings): SplitSystem[] {
  return patchOutdoor(systems, s, o, (outdoor) => ({ ...outdoor, indoors: [...outdoor.indoors, makeIndoor("12k", settings)] }));
}

export function copyIndoor(systems: SplitSystem[], s: number, o: number, i: number): SplitSystem[] {
  return patchOutdoor(systems, s, o, (outdoor) => {
    const source = outdoor.indoors[i];
    if (!source) return outdoor;
    const indoors = outdoor.indoors.slice();
    indoors.splice(i + 1, 0, { ...source, id: nid("in") });
    return { ...outdoor, indoors };
  });
}

export function removeIndoor(systems: SplitSystem[], s: number, o: number, i: number): SplitSystem[] {
  return patchOutdoor(systems, s, o, (outdoor) => {
    if (outdoor.indoors.length <= 1) return outdoor;
    return { ...outdoor, indoors: outdoor.indoors.filter((_, ii) => ii !== i) };
  });
}

export function addOutdoor(systems: SplitSystem[], s: number, settings: Settings): SplitSystem[] {
  return systems.map((system, si) => si === s ? { ...system, outdoors: [...system.outdoors, makeOutdoor("12k", settings)] } : system);
}

export function removeOutdoor(systems: SplitSystem[], s: number, o: number): SplitSystem[] {
  return systems.map((system, si) => {
    if (si !== s || system.outdoors.length <= 1) return system;
    return { ...system, outdoors: system.outdoors.filter((_, oi) => oi !== o) };
  });
}

export function patchMount(systems: SplitSystem[], s: number, o: number, patch: Partial<OutdoorUnit>): SplitSystem[] {
  return patchOutdoor(systems, s, o, (outdoor) => ({ ...outdoor, ...patch }));
}

export function addSystem(systems: SplitSystem[], settings: Settings): SplitSystem[] {
  return [...systems, freshSingle(settings)];
}

export function removeSystem(systems: SplitSystem[], s: number): SplitSystem[] {
  if (systems.length <= 1) return systems;
  return systems.filter((_, si) => si !== s);
}

function lineAmount(meters: string, price: string): number {
  const length = num(meters);
  if (!(length > 0)) return 0;
  return length * num(price);
}

export type DetailLine = { label: string; amount: number; heading?: boolean };

export function detailLines(systems: SplitSystem[] | undefined): DetailLine[] {
  const lines: DetailLine[] = [];
  for (const [si, system] of (systems ?? []).entries()) {
    const blocks: DetailLine[] = [];
    system.outdoors.forEach((outdoor, oi) => {
      const mountName = outdoor.mount === "ground" ? "Basament toke" : "Mbajtëse muri";
      const mount = num(outdoor.mountQty) * num(outdoor.mountPrice);
      const headLines: DetailLine[] = [];
      if (mount > 0) headLines.push({ label: `${mountName} × ${outdoor.mountQty || "0"}`, amount: mount });
      outdoor.indoors.forEach((unit) => {
        const rows: DetailLine[] = [
          { label: `Tub i lëngshëm ${unit.liquid}" × ${unit.liquidM || "0"} m`, amount: lineAmount(unit.liquidM, unit.liquidPrice) },
          { label: `Tub i avullit ${unit.vapor}" × ${unit.vaporM || "0"} m`, amount: lineAmount(unit.vaporM, unit.vaporPrice) },
          { label: `Kabllo 3×2.5 × ${unit.cable3M || "0"} m`, amount: lineAmount(unit.cable3M, unit.cable3Price) },
          { label: `Kabllo 5×1.5 × ${unit.cable5M || "0"} m`, amount: lineAmount(unit.cable5M, unit.cable5Price) },
          { label: `Drenazh × ${unit.drainM || "0"} m`, amount: lineAmount(unit.drainM, unit.drainPrice) },
        ].filter((row) => row.amount > 0);
        if (rows.length) {
          headLines.push({ label: `Koka ${unit.size || "—"} · ${unit.liquid}" + ${unit.vapor}"`, amount: 0, heading: true });
          headLines.push(...rows);
        }
      });
      if (headLines.length) {
        blocks.push({
          label: `${system.outdoors.length > 1 || systems!.length > 1 ? `${si + 1}.${oi + 1} ` : ""}Njësia e jashtme ${outdoor.size || "—"} · ${mountName}`,
          amount: 0,
          heading: true,
        });
        blocks.push(...headLines);
      }
    });
    if (blocks.length) {
      lines.push({ label: system.kind === "multi" ? "Multi split" : "Single split", amount: 0, heading: true });
      lines.push(...blocks);
    }
  }
  return lines;
}

export function systemRollup(systems: SplitSystem[] | undefined): { sell: number; cost: number } {
  const sell = detailLines(systems).reduce((sum, line) => sum + (line.heading ? 0 : line.amount), 0);
  return { sell, cost: sell };
}

export function summarize(systems: SplitSystem[] | undefined): string {
  if (!systems?.length) return "";
  return systems.map((system) => {
    const parts = system.outdoors.map((outdoor) => {
      const heads = outdoor.indoors.map((unit) => unit.size).filter(Boolean);
      return system.kind === "multi" ? `${outdoor.size} (${heads.join(" + ")})` : (outdoor.indoors[0]?.size || outdoor.size);
    });
    return `${system.kind === "multi" ? "Multi split" : "Single split"} ${parts.join(", ")}`.trim();
  }).join("; ");
}

export function headSummary(unit: IndoorUnit): string {
  const money = lineAmount(unit.liquidM, unit.liquidPrice)
    + lineAmount(unit.vaporM, unit.vaporPrice)
    + lineAmount(unit.cable3M, unit.cable3Price)
    + lineAmount(unit.cable5M, unit.cable5Price)
    + lineAmount(unit.drainM, unit.drainPrice);
  return `${unit.size || "—"} · ${unit.liquid}" + ${unit.vapor}" · ${unit.runM || "0"} m · ${Math.round(money).toLocaleString("en-US")} Lek`;
}

/** The list to show. Saved systems win. A quote with none is one single split at 0 m. */
export function systemsOf(money: JobMoney | undefined, settings: Settings, id = "saved"): SplitSystem[] {
  if (money?.systems?.length) return money.systems;
  return [migratedSingle(money?.size || "12k", settings, id)];
}
