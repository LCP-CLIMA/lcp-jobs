import { gaugeBarForSaturation } from "./charge";
import type { ChargeMode, ChargeReading, ChargeRefrigerant } from "./types";

/**
 * Fieldpiece Job Link label map. Add a phrase when a real sample uses different wording.
 * Longer phrases are tried first so "suction line temp" wins over "suction".
 */
export type FieldpieceKey =
  | "suctionPressure"
  | "liquidPressure"
  | "evapSat"
  | "condSat"
  | "suctionTemp"
  | "liquidTemp"
  | "superheat"
  | "subcooling"
  | "returnAir"
  | "supplyAir"
  | "wetBulb"
  | "outdoorAmbient";

export const FIELD_LABELS: { key: FieldpieceKey; labels: string[] }[] = [
  { key: "suctionPressure", labels: ["suction pressure", "vapor pressure", "vapour pressure", "low side pressure", "low pressure", "suction/vapor pressure", "vsat pressure"] },
  { key: "liquidPressure", labels: ["liquid pressure", "liquid line pressure", "high side pressure", "high pressure", "discharge pressure", "head pressure"] },
  { key: "suctionTemp", labels: ["suction line temperature", "suction line temp", "vapor line temp", "vapour line temp", "slt"] },
  { key: "liquidTemp", labels: ["liquid line temperature", "liquid line temp", "llt"] },
  { key: "evapSat", labels: ["evaporator saturation", "evap saturation", "vapor saturation", "vapour saturation", "suction saturation", "vsat", "sst"] },
  { key: "condSat", labels: ["condenser saturation", "condensing saturation", "liquid saturation", "lsat", "sct"] },
  { key: "superheat", labels: ["superheat", "vapor superheat", "total superheat"] },
  { key: "subcooling", labels: ["subcooling", "sub-cooling", "liquid subcooling"] },
  { key: "returnAir", labels: ["return dry bulb", "return air dry bulb", "return db", "indoor return", "return air", "iddb", "ra db"] },
  { key: "supplyAir", labels: ["supply dry bulb", "supply air dry bulb", "supply db", "indoor supply", "supply air", "sa db"] },
  { key: "wetBulb", labels: ["return wet bulb", "wet bulb", "return wb", "iwb"] },
  { key: "outdoorAmbient", labels: ["outdoor ambient", "outdoor dry bulb", "outdoor db", "ambient", "oddb", "oda"] },
];

export type ParsedNumber = { value: number; note: string };

export type FieldpieceParse = {
  refrigerant: ChargeRefrigerant | null;
  mode: ChargeMode | null;
  values: Partial<Record<FieldpieceKey, ParsedNumber>>;
  unrecognized: string[];
};

const NUMBER = String.raw`(-?\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(?:\s*(bar\(a\)|bar\s*abs|bara|bar|psig|psi|kpa\(a\)|kpa|mpa\(a\)|mpa|°\s*c|°\s*f|\bc\b|\bf\b))?`;

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function round(value: number, digits: number): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

type UnitKind = "pressure" | "temp" | "delta";

const KIND: Record<FieldpieceKey, UnitKind> = {
  suctionPressure: "pressure",
  liquidPressure: "pressure",
  evapSat: "temp",
  condSat: "temp",
  suctionTemp: "temp",
  liquidTemp: "temp",
  superheat: "delta",
  subcooling: "delta",
  returnAir: "temp",
  supplyAir: "temp",
  wetBulb: "temp",
  outdoorAmbient: "temp",
};

function isAbsolutePressure(unit: string): boolean {
  return /abs|\(a\)|bara/.test(unit);
}

function toBarGauge(value: number, unit: string): { bar: number; note: string } {
  const u = unit.toLowerCase().replace(/\s/g, "");
  const absolute = isAbsolutePressure(u);
  if (u.startsWith("psi")) return { bar: value / 14.5038, note: "presioni u kthye në bar" };
  if (u.includes("mpa")) {
    const bar = value * 10 - (absolute ? 1.01325 : 0);
    return { bar, note: absolute ? "presioni absolut u kthye në bar" : "presioni u kthye në bar" };
  }
  if (u.includes("kpa")) {
    const bar = value / 100 - (absolute ? 1.01325 : 0);
    return { bar, note: absolute ? "presioni absolut u kthye në bar" : "presioni u kthye në bar" };
  }
  if (absolute) return { bar: value - 1.01325, note: "presioni absolut u kthye në bar" };
  return { bar: value, note: "" };
}

function toCelsius(value: number, unit: string, kind: UnitKind): { c: number; note: string } {
  const u = unit.toLowerCase().replace(/\s/g, "");
  const fahrenheit = u === "f" || u.includes("°f") || u === "°f";
  if (!fahrenheit) return { c: value, note: "" };
  const c = kind === "delta" ? (value * 5) / 9 : ((value - 32) * 5) / 9;
  return { c, note: "temperatura u kthye në °C" };
}

function normalizeUnit(raw: string | undefined): string {
  return (raw ?? "").replace(/°/g, "°").trim();
}

export function parseFieldpieceText(text: string): FieldpieceParse {
  const source = text.replace(/\r/g, "\n").replace(/[|]/g, " ");
  const flat = source.replace(/\n+/g, "\n");
  const refrigerant = readRefrigerant(flat);
  const mode = readMode(flat);
  const values: Partial<Record<FieldpieceKey, ParsedNumber>> = {};
  const used: [number, number][] = [];
  const labels = FIELD_LABELS.flatMap((entry) => entry.labels.map((label) => ({ key: entry.key, label })))
    .sort((a, b) => b.label.length - a.label.length);

  for (const entry of labels) {
    if (values[entry.key]) continue;
    const pattern = new RegExp(`(?:^|\\n|\\s)${escapeReg(entry.label)}\\s*[:\\-]?\\s*${NUMBER}\\s*${UNIT}`, "i");
    const match = pattern.exec(flat);
    if (!match || match.index == null) continue;
    const start = match.index;
    const end = start + match[0].length;
    if (used.some(([lo, hi]) => start < hi && end > lo)) continue;
    used.push([start, end]);
    const raw = Number.parseFloat(match[1].replace(",", "."));
    if (!Number.isFinite(raw)) continue;
    const unit = normalizeUnit(match[2]);
    const kind = KIND[entry.key];
    if (kind === "pressure") {
      const converted = toBarGauge(raw, unit || "bar");
      values[entry.key] = { value: converted.bar, note: converted.note };
    } else {
      const converted = toCelsius(raw, unit || "°C", kind);
      values[entry.key] = { value: converted.c, note: converted.note };
    }
  }

  const unrecognized = flat
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 3 && /\d/.test(line))
    .filter((line) => !labels.some((entry) => line.toLowerCase().includes(entry.label.toLowerCase())))
    .filter((line) => !/refrigerant|r-?\s*32|r-?\s*410|r-?\s*22|fieldpiece|job link/i.test(line))
    .slice(0, 8);

  return { refrigerant, mode, values, unrecognized };
}

function readRefrigerant(text: string): ChargeRefrigerant | null {
  if (/r\s*-?\s*410\s*a/i.test(text)) return "R410A";
  if (/r\s*-?\s*32\b/i.test(text)) return "R32";
  if (/r\s*-?\s*22\b/i.test(text)) return "R22";
  return null;
}

function readMode(text: string): ChargeMode | null {
  if (/\b(heat|heating|ngrohje)\b/i.test(text)) return "heating";
  if (/\b(cool|cooling|ftohje)\b/i.test(text)) return "cooling";
  return null;
}

export type FieldpieceDraft = {
  reading: ChargeReading;
  notes: string[];
};

/** Build a review draft in bar and °C. Missing report fields stay blank. */
export function draftFromFieldpiece(text: string, base: ChargeReading): FieldpieceDraft {
  const parsed = parseFieldpieceText(text);
  const notes: string[] = [];
  const reading: ChargeReading = {
    ...base,
    pressureUnit: "bar",
    refrigerant: parsed.refrigerant ?? base.refrigerant,
    mode: parsed.mode ?? base.mode,
  };
  if (!parsed.refrigerant) notes.push("Lloji i gazit nuk u njoh. Mbetet ai që është zgjedhur, derisa ta ndryshosh.");
  const take = (key: FieldpieceKey, field: keyof ChargeReading, digits: number) => {
    const found = parsed.values[key];
    if (!found) return;
    reading[field] = round(found.value, digits) as never;
    if (found.note) notes.push(`${labelOf(key)}: ${found.note}.`);
  };
  take("suctionPressure", "suctionPressure", 2);
  take("liquidPressure", "liquidPressure", 2);
  take("suctionTemp", "suctionTemp", 1);
  take("liquidTemp", "liquidTemp", 1);
  take("returnAir", "returnAir", 1);
  take("supplyAir", "supplyAir", 1);
  take("wetBulb", "wetBulb", 1);
  take("outdoorAmbient", "outdoorAmbient", 1);

  const gas = reading.refrigerant;
  if (!reading.suctionPressure && parsed.values.evapSat) {
    const bar = gaugeBarForSaturation(gas, parsed.values.evapSat.value);
    if (bar != null) {
      reading.suctionPressure = round(bar, 2);
      notes.push("Presioni i thithjes u njehsua nga temperatura e avullimit në raport.");
    }
  }
  if (!reading.liquidPressure && parsed.values.condSat) {
    const bar = gaugeBarForSaturation(gas, parsed.values.condSat.value);
    if (bar != null) {
      reading.liquidPressure = round(bar, 2);
      notes.push("Presioni i lëngut u njehsua nga temperatura e kondensimit në raport.");
    }
  }
  if (!reading.suctionTemp && parsed.values.evapSat && parsed.values.superheat) {
    reading.suctionTemp = round(parsed.values.evapSat.value + parsed.values.superheat.value, 1);
    notes.push("Temperatura e tubit të thithjes u njehsua nga avullimi dhe superheat i raportit.");
  }
  if (!reading.liquidTemp && parsed.values.condSat && parsed.values.subcooling) {
    reading.liquidTemp = round(parsed.values.condSat.value - parsed.values.subcooling.value, 1);
    notes.push("Temperatura e tubit të lëngut u njehsua nga kondensimi dhe subcooling i raportit.");
  }
  const blanks: FieldpieceKey[] = ["suctionPressure", "liquidPressure", "suctionTemp", "liquidTemp", "returnAir", "supplyAir", "wetBulb", "outdoorAmbient"];
  for (const key of blanks) {
    const field = key as keyof ChargeReading;
    if (!reading[field] && !parsed.values[key]) notes.push(`${labelOf(key)} nuk u njoh në raport.`);
  }
  if (parsed.unrecognized.length) {
    notes.push(`Rreshta të panjohur: ${parsed.unrecognized.join(" · ")}`);
  }
  return { reading, notes };
}

function labelOf(key: FieldpieceKey): string {
  const names: Record<FieldpieceKey, string> = {
    suctionPressure: "Presioni i thithjes",
    liquidPressure: "Presioni i lëngut",
    evapSat: "Avullimi",
    condSat: "Kondensimi",
    suctionTemp: "Temperatura e tubit të thithjes",
    liquidTemp: "Temperatura e tubit të lëngut",
    superheat: "Superheat",
    subcooling: "Subcooling",
    returnAir: "Ajri i kthimit",
    supplyAir: "Ajri i furnizimit",
    wetBulb: "Wet bulb",
    outdoorAmbient: "Ambienti jashtë",
  };
  return names[key];
}
