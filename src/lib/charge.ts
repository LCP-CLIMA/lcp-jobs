import type { ChargeMetering, ChargeMode, ChargeReading, ChargeRefrigerant, PressureUnit } from "./types";

/** Saturation table: liquid temperature in °C and gauge pressure. Approximate field tables; the nameplate wins. */
const TABLES: Record<ChargeRefrigerant, { c: number; bar: number }[]> = {
  R22: [
    { c: -40, bar: 0.04 }, { c: -30, bar: 0.63 }, { c: -20, bar: 1.44 }, { c: -10, bar: 2.53 },
    { c: 0, bar: 3.97 }, { c: 10, bar: 5.8 }, { c: 20, bar: 8.09 }, { c: 30, bar: 10.91 },
    { c: 40, bar: 14.33 }, { c: 50, bar: 18.41 }, { c: 60, bar: 23.25 },
  ],
  R410A: [
    { c: -30, bar: 1.69 }, { c: -20, bar: 2.99 }, { c: -10, bar: 4.72 }, { c: 0, bar: 6.98 },
    { c: 10, bar: 9.84 }, { c: 20, bar: 13.44 }, { c: 25, bar: 15.54 }, { c: 30, bar: 17.89 },
    { c: 35, bar: 20.49 }, { c: 40, bar: 23.34 }, { c: 45, bar: 26.49 }, { c: 50, bar: 29.89 },
    { c: 55, bar: 33.59 },
  ],
  R32: [
    { c: -30, bar: 1.84 }, { c: -20, bar: 3.09 }, { c: -10, bar: 4.79 }, { c: 0, bar: 7.12 },
    { c: 10, bar: 10.09 }, { c: 20, bar: 13.74 }, { c: 25, bar: 15.89 }, { c: 30, bar: 18.29 },
    { c: 35, bar: 20.89 }, { c: 40, bar: 23.79 }, { c: 45, bar: 26.99 }, { c: 50, bar: 30.39 },
    { c: 55, bar: 34.19 },
  ],
};

const PSI_PER_BAR = 14.5038;

export type Tone = "ok" | "warn" | "bad" | "none";

export type ChargeValue = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  target: string;
  tone: Tone;
};

export type ChargeFinding = {
  id: string;
  en: string;
  sq: string;
  customer: string;
};

export type ChargeResult = {
  ready: boolean;
  evapSat: number | null;
  condSat: number | null;
  superheat: number | null;
  subcooling: number | null;
  deltaT: number | null;
  approach: number | null;
  values: ChargeValue[];
  findings: ChargeFinding[];
  techSummary: string;
  customerText: string;
  targets: string;
};

export function blankChargeReading(): ChargeReading {
  return {
    id: "",
    at: "",
    refrigerant: "R32",
    mode: "cooling",
    metering: "exv",
    pressureUnit: "bar",
    suctionPressure: "",
    liquidPressure: "",
    suctionTemp: "",
    liquidTemp: "",
    returnAir: "",
    supplyAir: "",
    outdoorAmbient: "",
    wetBulb: "",
    compressorAmps: "",
    ratedAmps: "",
    lineSetM: "",
  };
}

export function toBarGauge(value: number, unit: PressureUnit): number {
  return unit === "psi" ? value / PSI_PER_BAR : value;
}

/** Gauge pressure for a saturation temperature, from the same table. */
export function gaugeBarForSaturation(refrigerant: ChargeRefrigerant, tempC: number): number | null {
  const table = TABLES[refrigerant];
  if (tempC < table[0].c - 1 || tempC > table[table.length - 1].c + 1) return null;
  if (tempC <= table[0].c) return table[0].bar;
  if (tempC >= table[table.length - 1].c) return table[table.length - 1].bar;
  for (let i = 1; i < table.length; i += 1) {
    const hi = table[i];
    const lo = table[i - 1];
    if (tempC <= hi.c) {
      const span = hi.c - lo.c;
      const t = span === 0 ? 0 : (tempC - lo.c) / span;
      return lo.bar + t * (hi.bar - lo.bar);
    }
  }
  return null;
}

export function saturationC(refrigerant: ChargeRefrigerant, barGauge: number): number | null {
  const table = TABLES[refrigerant];
  if (barGauge < table[0].bar - 0.4 || barGauge > table[table.length - 1].bar + 0.4) return null;
  if (barGauge <= table[0].bar) return table[0].c;
  if (barGauge >= table[table.length - 1].bar) return table[table.length - 1].c;
  for (let i = 1; i < table.length; i += 1) {
    const hi = table[i];
    const lo = table[i - 1];
    if (barGauge <= hi.bar) {
      const span = hi.bar - lo.bar;
      const t = span === 0 ? 0 : (barGauge - lo.bar) / span;
      return lo.c + t * (hi.c - lo.c);
    }
  }
  return null;
}

function optionalNum(value: string): number | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function band(value: number, low: number, high: number): Tone {
  if (value >= low && value <= high) return "ok";
  if (value >= low - 2 && value <= high + 2) return "warn";
  return "bad";
}

export function targetsFor(metering: ChargeMetering, mode: ChargeMode): {
  sh: [number, number];
  sc: [number, number];
  delta: [number, number];
  approach: [number, number];
  text: string;
} {
  const txv = metering === "exv" || metering === "txv";
  const sh: [number, number] = txv ? [4, 9] : [8, 16];
  const sc: [number, number] = txv ? [5, 11] : [3, 8];
  const delta: [number, number] = mode === "heating" ? [12, 22] : [8, 12];
  const approach: [number, number] = [8, 16];
  const text = mode === "cooling"
    ? `Superheat ${sh[0]}–${sh[1]} °C. Subcooling ${sc[0]}–${sc[1]} °C. Delta-T i brendshëm ${delta[0]}–${delta[1]} °C. Kondensimi mbi ambientin ${approach[0]}–${approach[1]} °C. Avullimi i synuar 2–10 °C.`
    : `Superheat ${sh[0]}–${sh[1]} °C. Subcooling ${sc[0]}–${sc[1]} °C. Delta-T në ngrohje ${delta[0]}–${delta[1]} °C. Kondensimi mbi ajrin e brendshëm ${approach[0]}–${approach[1]} °C.`;
  return { sh, sc, delta, approach, text };
}

const DISCLAIMER = "Udhëzim, jo vendim fabrike. Të dhënat e prodhuesit dhe targëza e ngarkesës kanë përparësi. / Guidance only. Manufacturer charge data and the nameplate override this.";

export function evaluateReading(reading: ChargeReading): ChargeResult {
  const targets = targetsFor(reading.metering, reading.mode);
  const suction = optionalNum(reading.suctionPressure);
  const liquid = optionalNum(reading.liquidPressure);
  const suctionTemp = optionalNum(reading.suctionTemp);
  const liquidTemp = optionalNum(reading.liquidTemp);
  const returnAir = optionalNum(reading.returnAir);
  const supplyAir = optionalNum(reading.supplyAir);
  const outdoor = optionalNum(reading.outdoorAmbient);
  const amps = optionalNum(reading.compressorAmps);
  const rated = optionalNum(reading.ratedAmps);
  const lineM = optionalNum(reading.lineSetM);

  const evapSat = suction == null ? null : saturationC(reading.refrigerant, toBarGauge(suction, reading.pressureUnit));
  const condSat = liquid == null ? null : saturationC(reading.refrigerant, toBarGauge(liquid, reading.pressureUnit));
  const superheat = evapSat == null || suctionTemp == null ? null : suctionTemp - evapSat;
  const subcooling = condSat == null || liquidTemp == null ? null : condSat - liquidTemp;
  const deltaT = returnAir == null || supplyAir == null
    ? null
    : reading.mode === "heating" ? supplyAir - returnAir : returnAir - supplyAir;
  const approachRef = reading.mode === "heating" ? returnAir : outdoor;
  const approach = condSat == null || approachRef == null ? null : condSat - approachRef;
  const ampRatio = amps == null || rated == null || rated <= 0 ? null : amps / rated;

  const shTone = superheat == null ? "none" : band(superheat, targets.sh[0], targets.sh[1]);
  const scTone = subcooling == null ? "none" : band(subcooling, targets.sc[0], targets.sc[1]);
  const evapTone = evapSat == null ? "none" : reading.mode === "cooling" ? band(evapSat, 2, 10) : "none";
  const deltaTone = deltaT == null ? "none" : band(deltaT, targets.delta[0], targets.delta[1]);
  const approachTone = approach == null ? "none" : approach < 0 ? "warn" : approach <= targets.approach[1] ? (approach < targets.approach[0] ? "ok" : "ok") : approach <= targets.approach[1] + 4 ? "warn" : "bad";
  const ampTone = ampRatio == null ? "none" : band(ampRatio * 100, 80, 105);

  const highSh = shTone === "bad" && superheat != null && superheat > targets.sh[1];
  const lowSh = shTone === "bad" && superheat != null && superheat < targets.sh[0];
  const highSc = scTone === "bad" && subcooling != null && subcooling > targets.sc[1];
  const lowSc = scTone === "bad" && subcooling != null && subcooling < targets.sc[0];
  const lowPressure = evapTone === "bad" && evapSat != null && evapSat < 2;
  const highHead = (approach != null && approach > targets.approach[1]) || (condSat != null && condSat > 55);

  const findings: ChargeFinding[] = [];
  const ready = superheat != null && subcooling != null;
  if (!ready) {
    findings.push({
      id: "incomplete",
      en: "Enter both pressures and both line temperatures for a charge diagnosis.",
      sq: "Vendos të dy presionet dhe të dy temperaturat e tubave për diagnozën e ngarkesës.",
      customer: "Matja nuk është e plotë ende.",
    });
  } else {
    if (highSh && lowSc && lowPressure) {
      findings.push({
        id: "undercharge",
        en: "High superheat, low subcooling and low suction: likely undercharge or a leak.",
        sq: "Superheat i lartë, subcooling i ulët dhe presion i ulët: pak gaz ose rrjedhje.",
        customer: "Njësia ka më pak gaz sesa duhet. Kjo shpesh vjen nga një rrjedhje. Nuk punon me forcën e duhur dhe kompresori mund të dëmtohet nëse vazhdon kështu.",
      });
    } else if (highSh && lowSc) {
      findings.push({
        id: "undercharge-soft",
        en: "High superheat and low subcooling suggest low charge, but suction is not clearly low. Check the gauges and the charge.",
        sq: "Superheat i lartë dhe subcooling i ulët tregojnë pak gaz, por thithja nuk është qartë e ulët. Kontrollo matjen dhe ngarkesën.",
        customer: "Duket se gazi është i pakët, por matja duhet kontrolluar edhe një herë para se të shtohet gaz.",
      });
    }
    if (lowSh && highSc && highHead) {
      findings.push({
        id: "overcharge",
        en: "Low superheat, high subcooling and high head: likely overcharge.",
        sq: "Superheat i ulët, subcooling i lartë dhe presion i lartë në anën e lartë: gaz i tepërt.",
        customer: "Njësia ka më shumë gaz sesa duhet. Presioni është i lartë. Gazi i tepërt duhet hequr, jo shtuar.",
      });
    } else if (lowSh && highSc) {
      findings.push({
        id: "overcharge-soft",
        en: "Low superheat and high subcooling look like overcharge, but head pressure is not clearly high.",
        sq: "Superheat i ulët dhe subcooling i lartë duken si gaz i tepërt, por kreu nuk është qartë i lartë.",
        customer: "Mund të ketë gaz të tepërt. Mos shtoni gaz para se ta konfirmojë tekniku.",
      });
    }
    if (highSh && highSc) {
      findings.push({
        id: "restriction",
        en: "High superheat and high subcooling: likely a restriction in the filter drier, EXV or a kinked line.",
        sq: "Superheat i lartë dhe subcooling i lartë: ngushtim në tharës, EXV ose tub i shtypur.",
        customer: "Gazi nuk po kalon lirshëm në tub ose në valvul. Duhet kontrolluar filtri dhe linja, jo vetëm sasia e gazit.",
      });
    }
    const chargeLooksNormal = !highSh && !lowSh && !highSc && !lowSc;
    if (deltaTone === "bad" && deltaT != null && deltaT < targets.delta[0] && chargeLooksNormal) {
      findings.push({
        id: "airflow",
        en: "Indoor temperature split is low while the charge looks normal: weak airflow, a dirty indoor coil or a blocked filter.",
        sq: "Diferenca e temperaturës së ajrit është e ulët dhe ngarkesa duket normale: ajër i dobët, spirale e ndotur ose filtër i bllokuar.",
        customer: "Ajri brenda nuk po kalon mirë. Filtri ose spiralja e brendshme mund të jenë të ndotur.",
      });
    }
    if (highHead && !findings.some((item) => item.id === "overcharge" || item.id === "overcharge-soft")) {
      findings.push({
        id: "dirty-condenser",
        en: "Head pressure is high without an overcharge pattern: dirty condenser, poor outdoor airflow, or non-condensables.",
        sq: "Presioni i kreut është i lartë pa shenjat e gazit të tepërt: kondensator i ndotur, ajër i dobët jashtë, ose ajër në qark.",
        customer: "Njësia jashtë nuk po heq nxehtësinë mirë. Kondensatori jashtë duhet pastruar dhe ajri rreth saj duhet të jetë i lirë.",
      });
    }
    if (ampRatio != null && ampRatio > 1.15) {
      findings.push({
        id: "high-amps",
        en: "Compressor current is above the rated amps.",
        sq: "Rryma e kompresorit është mbi amperët e targëzës.",
        customer: "Motori po tërheq më shumë rrymë sesa shkruan targëza.",
      });
    } else if (ampRatio != null && ampRatio < 0.7) {
      findings.push({
        id: "low-amps",
        en: "Compressor current is well below the rated amps. Compare only at full speed.",
        sq: "Rryma e kompresorit është shumë nën amperët e targëzës. Krahasoje vetëm në shpejtësi të plotë.",
        customer: "Motori po punon me më pak rrymë sesa zakonisht, nëse matja është në shpejtësi të plotë.",
      });
    }
    if (lineM != null && lineM > 15) {
      findings.push({
        id: "long-line",
        en: "The line set is longer than a typical nameplate length. Do not correct the charge without the manufacturer table.",
        sq: "Linja është më e gjatë se gjatësia e zakonshme e targëzës. Mos e korrigjo ngarkesën pa tabelën e prodhuesit.",
        customer: "Tubat janë të gjatë. Sasia e gazit varet nga udhëzimi i fabrikës për atë gjatësi.",
      });
    }
    if (findings.length === 0) {
      findings.push({
        id: "normal",
        en: "The charge indicators are inside the rule-of-thumb ranges.",
        sq: "Treguesit e ngarkesës janë brenda intervaleve të zakonshme.",
        customer: "Matjet e gazit dhe të temperaturës janë brenda intervalit të zakonshëm. Kjo nuk zëvendëson kontrollin e targëzës.",
      });
    }
  }

  const values: ChargeValue[] = [
    { key: "evap", label: "Avullimi / Evaporator sat", value: evapSat, unit: "°C", target: reading.mode === "cooling" ? "2–10 °C" : "sipas ambientit jashtë", tone: evapTone },
    { key: "cond", label: "Kondensimi / Condensing sat", value: condSat, unit: "°C", target: "nga presioni i lartë", tone: "none" },
    { key: "sh", label: "Superheat", value: superheat, unit: "°C", target: `${targets.sh[0]}–${targets.sh[1]} °C`, tone: shTone },
    { key: "sc", label: "Subcooling", value: subcooling, unit: "°C", target: `${targets.sc[0]}–${targets.sc[1]} °C`, tone: scTone },
    { key: "dt", label: "Delta-T ajër / Air split", value: deltaT, unit: "°C", target: `${targets.delta[0]}–${targets.delta[1]} °C`, tone: deltaTone },
    { key: "approach", label: reading.mode === "heating" ? "Kondensimi mbi ajrin e brendshëm" : "Kondensimi mbi ambientin", value: approach, unit: "°C", target: `${targets.approach[0]}–${targets.approach[1]} °C`, tone: approachTone },
    { key: "amps", label: "Rryma / Rated amps", value: ampRatio == null ? null : ampRatio * 100, unit: "%", target: "80–105%", tone: ampTone },
  ];

  const modeEn = reading.mode === "heating" ? "Heating" : "Cooling";
  const modeSq = reading.mode === "heating" ? "Ngrohje" : "Ftohje";
  const meter = reading.metering === "capillary" ? "Capillary / Kapilar" : reading.metering === "txv" ? "TXV" : "EXV / inverter";
  const lines = values
    .filter((item) => item.value != null && item.key !== "amps" || (item.key === "amps" && item.value != null))
    .map((item) => `${item.label}: ${item.value == null ? "—" : item.value.toFixed(1)} ${item.unit} (synimi ${item.target})`);
  const findingLines = findings.map((item) => `${item.en} / ${item.sq}`);
  const inverter = reading.metering === "exv"
    ? "Inverter: take the readings in test or forced mode, at full speed, after at least 15 minutes. / Për inverter: matje në test, shpejtësi e plotë, pas të paktën 15 minutash."
    : "";
  const techSummary = [
    `Kontroll sistemi / System check — ${reading.refrigerant} · ${modeSq} / ${modeEn} · ${meter}`,
    ...lines,
    ...findingLines,
    inverter,
    DISCLAIMER,
  ].filter(Boolean).join("\n");

  const customerText = [
    "Shpjegim për klientin",
    ...findings.map((item) => item.customer),
    reading.metering === "exv" ? "Matja e inverterit vlen kur njësia punon në provë, me shpejtësi të plotë, pas të paktën 15 minutash." : "",
    "Ky është një udhëzim nga matjet në vend. Të dhënat e fabrikës dhe targëza kanë përparësi.",
  ].filter(Boolean).join("\n");

  return {
    ready,
    evapSat,
    condSat,
    superheat,
    subcooling,
    deltaT,
    approach,
    values,
    findings,
    techSummary,
    customerText,
    targets: targets.text,
  };
}
