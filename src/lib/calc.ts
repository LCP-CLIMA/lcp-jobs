import { num } from "./format";
import type { BreakEvenRow, Calc, CalcInput, Pipe, PriceBook, Row, Size } from "./types";

export const SIZES: Size[] = ["12k", "18k", "24k"];
export const PIPES: Pipe[] = ["1/4", "3/8", "1/2", "5/8", "3/4"];
export const PAIR: Record<Size, [Pipe, Pipe]> = {
  "12k": ["1/4", "3/8"],
  "18k": ["1/4", "1/2"],
  "24k": ["3/8", "5/8"],
};

export function pipeName(kind: string, p: Pipe): string {
  return `Copper pipe ${kind} ${p}" with insulation (tub bakri me veshje), m`;
}

export function btuFor(size: Size): string {
  if (size === "12k") return "12000";
  if (size === "18k") return "18000";
  return "24000";
}

/** Trunking under 3 m (but not zero) is counted as 3 m. Zero means no run. */
export function qtyOf(x: Row): number {
  if (x.enabled === false) return 0;
  if (x.id === "t1" && num(x.qty) > 0) return Math.max(3, num(x.qty));
  return num(x.qty);
}

/** Older jobs omit these flags. Omitted means the cost is still included. */
export function included(flag: boolean | undefined): boolean {
  return flag !== false;
}

export function withPipes(rows: Row[], liquid: Pipe, gas: Pipe, pipe: PriceBook["pipe"]): Row[] {
  return rows.map((x) =>
    x.id === "m1"
      ? { ...x, name: pipeName("liquid", liquid), price: pipe[liquid] }
      : x.id === "m5"
        ? { ...x, name: pipeName("gas", gas), price: pipe[gas] }
        : x,
  );
}

export function applySize<T extends CalcInput>(job: T, size: Size): T {
  const [liquid, gas] = PAIR[size];
  return {
    ...job,
    size,
    labor: job.book.labor[size],
    liquid,
    gas,
    materials: withPipes(job.materials, liquid, gas, job.book.pipe),
  };
}

export function fixedPerKm(j: CalcInput): number {
  if (!j.inclFixed) return 0;
  return num(j.depr) + (num(j.kmYear) > 0 ? num(j.insYear) / num(j.kmYear) : 0);
}

export function fuelPerKm(j: CalcInput): number {
  return (num(j.cons) / 100) * num(j.fuel);
}

export function perKm(j: CalcInput): number {
  return fuelPerKm(j) + num(j.wear) + fixedPerKm(j);
}

export function refPerKg(j: CalcInput): number {
  return num(j.bottleKg) > 0 ? num(j.bottlePrice) / num(j.bottleKg) : 0;
}

export function compute(j: CalcInput): Calc {
  const unitLek = included(j.includeUnit) ? (j.cur === "EUR" ? num(j.unitPrice) * num(j.rate) : num(j.unitPrice)) : 0;
  const vatPart = (g: number, hasInv: boolean) => (j.vatReg && hasInv ? g / 6 : 0);
  const sumRows = (rows: Row[]) =>
    rows.reduce(
      (a, x) => {
        const g = qtyOf(x) * num(x.price);
        return { gross: a.gross + g, vat: a.vat + vatPart(g, x.vat) };
      },
      { gross: 0, vat: 0 },
    );
  const laborG = included(j.includeLabor) && j.laborCost ? num(j.labor) : 0;
  const vacG = included(j.includeLabor) && j.vacOn ? num(j.vac) : 0;
  const kmRound = 2 * num(j.km);
  const trG = included(j.includeTransport) ? kmRound * perKm(j) : 0;
  const trVat = included(j.includeTransport) ? vatPart(kmRound * fuelPerKm(j), !!j.fuelVat) : 0;
  const refGross = included(j.includeGas) ? (num(j.refG) / 1000) * refPerKg(j) : 0;
  const m = sumRows(j.materials);
  const t = sumRows(j.trunk);
  const c = sumRows(j.consum);
  const o = sumRows(j.other);
  const breakdown = [
    { label: "Unit (njësia)", gross: unitLek, vat: vatPart(unitLek, j.unitVat) },
    { label: "Labor to me (hak pune)", gross: laborG, vat: 0 },
    { label: "Vacuum + N₂ test", gross: vacG, vat: 0 },
    { label: "Transport (transporti)", gross: trG, vat: trVat },
    { label: "Refrigerant (gaz)", gross: refGross, vat: vatPart(refGross, !!j.refVat) },
    { label: "Materials (materiale)", gross: m.gross, vat: m.vat },
    { label: "Trunking (kanalina)", gross: t.gross, vat: t.vat },
    { label: "Consumables (konsumabël)", gross: c.gross, vat: c.vat },
    { label: "Other costs (të tjera)", gross: o.gross, vat: o.vat },
  ];
  const costGross = breakdown.reduce((a, b) => a + b.gross, 0);
  const inputVat = breakdown.reduce((a, b) => a + b.vat, 0);
  const costReal = costGross - inputVat;
  const extra = included(j.includeExtra) ? num(j.extraM) * num(j.extraRate) : 0;
  const sellDefault = unitLek + num(j.book.package[j.size]) + extra;
  const sell = j.sellOverride.trim() !== "" ? num(j.sellOverride) : sellDefault;
  const netRev = j.vatReg ? sell / 1.2 : sell;
  const outVat = sell - netRev;
  const vatPay = outVat - inputVat;
  const gross = netRev - costReal;
  const tax = gross > 0 ? (gross * num(j.taxRate)) / 100 : 0;
  const net = gross - tax;
  const margin = netRev > 0 ? (gross / netRev) * 100 : 0;
  const breakEven = j.vatReg ? costReal * 1.2 : costReal;
  return {
    unitLek,
    costGross,
    inputVat,
    costReal,
    sell,
    sellDefault,
    netRev,
    outVat,
    vatPay,
    gross,
    margin,
    tax,
    net,
    breakEven,
    breakdown,
  };
}

export function breakEvenBySize(job: CalcInput, c: Calc): BreakEvenRow[] {
  return SIZES.map((s) => {
    const unitReal = c.unitLek - (job.vatReg && job.unitVat ? c.unitLek / 6 : 0);
    const laborNow = job.laborCost ? num(job.labor) : 0;
    const vr = (g: number) => (job.vatReg ? g / 1.2 : g);
    const mRow = (id: string) => job.materials.find((x) => x.id === id);
    const mL = num(mRow("m1")?.qty ?? "0");
    const mG = num(mRow("m5")?.qty ?? "0");
    const pipeNow = vr(mL * num(mRow("m1")?.price ?? "0") + mG * num(mRow("m5")?.price ?? "0"));
    const pipeS = vr(mL * num(job.book.pipe[PAIR[s][0]]) + mG * num(job.book.pipe[PAIR[s][1]]));
    const rest = c.costReal - unitReal - laborNow - pipeNow + pipeS;
    const lab = job.laborCost ? num(job.book.labor[s]) : 0;
    const f = job.vatReg ? 1.2 : 1;
    const be = f * (lab + rest);
    const pkg = num(job.book.package[s]);
    const now = pkg / f - lab - rest;
    return { size: s, packageLek: pkg, profitNow: now, breakEven: be, plus2k: be + 2000 * f };
  });
}
