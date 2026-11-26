import { num } from "./format";
import { systemRollup } from "./split";
import type { InstallJob, JobMoney, JobRecord, Row, ServiceJob } from "./types";

export function emptyMoney(): JobMoney {
  return {
    unitBuy: "",
    matPipes: "",
    matInsulation: "",
    matCable: "",
    matBracket: "",
    matDrain: "",
    matGas: "",
    matOther: "",
    extraTravel: "",
    extraHelper: "",
    extraFloor: "",
    extraOther: "",
    vacuumCost: "",
    sellingPrice: "",
    unitSell: "",
    matPipesSell: "",
    matCableSell: "",
    matBracketSell: "",
    matDrainSell: "",
    matOtherSell: "",
    extraTravelSell: "",
    extraOtherSell: "",
    targetMargin: "",
    tiers: [
      { name: "", sell: "" },
      { name: "", sell: "" },
      { name: "", sell: "" },
    ],
    size: "",
    payWage: false,
    vacuumOn: false,
    purchasesVat: true,
    warrantyYears: "0",
    membershipYears: "1",
  };
}

export const SIZE_LABOR: Record<Exclude<JobMoney["size"], "">, number> = {
  "9k": 10000,
  "12k": 10000,
  "18k": 12000,
  "24k": 13000,
};

export const SIZE_PACKAGE: Record<Exclude<JobMoney["size"], "">, number> = {
  "9k": 20500,
  "12k": 20500,
  "18k": 22500,
  "24k": 23500,
};

export type MoneyTotals = {
  materials: number;
  extras: number;
  cost: number;
  sell: number;
  hasSell: boolean;
  outputVat: number;
  inputVat: number;
  vatToPay: number;
  beforeVat: number;
  profit: number;
  margin: number;
  /** Materials from Detaje, included in cost and, once a selling price exists, in the sale. */
  detail: number;
};

/**
 * L.C.P is VAT-registered. Prices are VAT-inclusive.
 * VAT in a gross amount is one sixth. Profit is the selling price, minus VAT still owed, minus costs.
 */
export function moneyTotals(money: JobMoney | undefined): MoneyTotals {
  const m = { ...emptyMoney(), ...money };
  const detail = systemRollup(m.systems).sell;
  const materials = num(m.matPipes) + num(m.matInsulation) + num(m.matCable) + num(m.matBracket) + num(m.matDrain) + num(m.matGas) + num(m.matOther);
  const extras = num(m.extraTravel) + (m.payWage ? num(m.extraHelper) : 0) + num(m.extraFloor) + num(m.extraOther) + (m.vacuumOn ? num(m.vacuumCost) : 0);
  const cost = num(m.unitBuy) + materials + extras + detail;
  const lineSell = num(m.unitSell) + num(m.matPipesSell) + num(m.matCableSell) + num(m.matBracketSell) + num(m.matDrainSell) + num(m.matOtherSell) + num(m.extraTravelSell) + num(m.extraOtherSell);
  const sellFields = [m.unitSell, m.matPipesSell, m.matCableSell, m.matBracketSell, m.matDrainSell, m.matOtherSell, m.extraTravelSell, m.extraOtherSell];
  const typedSell = sellFields.some((value) => (value ?? "").trim() !== "");
  const hasSell = typedSell || (m.sellingPrice ?? "").trim() !== "";
  const sell = (typedSell ? lineSell : num(m.sellingPrice)) + (hasSell ? detail : 0);
  const outputVat = sell / 6;
  const inputVat = m.purchasesVat !== false ? cost / 6 : 0;
  const vatToPay = outputVat - inputVat;
  const beforeVat = sell - cost;
  const profit = hasSell ? sell - vatToPay - cost : 0;
  const netSell = sell / 1.2;
  const margin = hasSell && netSell > 0 ? (profit / netSell) * 100 : 0;
  return { materials, extras, cost, sell, hasSell, outputVat, inputVat, vatToPay, beforeVat, profit, margin, detail };
}

/** Suggested VAT-inclusive selling price for a target margin on the price without VAT. */
export function suggestSell(cost: number, marginPercent: number): number | null {
  if (!(cost > 0) || !(marginPercent > 0) || marginPercent >= 100) return null;
  return cost / (1 - marginPercent / 100);
}

export function lineMargin(buy: number, sell: number, vatInvoice: boolean): number | null {
  if (!(sell > 0)) return null;
  const profit = vatInvoice ? (sell - buy) / 1.2 : sell / 1.2 - buy;
  return (profit / (sell / 1.2)) * 100;
}

function n(value: string | undefined): number {
  return num(value ?? "");
}

function field(amount: number): string {
  if (!amount) return "";
  return String(Math.round(amount));
}

function lineAmount(row: Row | undefined): number {
  if (!row || row.enabled === false) return 0;
  return num(row.qty) * num(row.price);
}

function placeMaterial(name: string, amount: number, money: JobMoney) {
  const label = name.toLowerCase();
  const add = (key: "matPipes" | "matInsulation" | "matCable" | "matBracket" | "matDrain" | "matGas" | "matOther") => {
    money[key] = field(num(money[key]) + amount);
  };
  if (/pipe|tub|copper|bakër|baker|1\/4|3\/8|1\/2|5\/8/.test(label)) add("matPipes");
  else if (/insul|izol|foam|shkum/.test(label)) add("matInsulation");
  else if (/cable|kabllo/.test(label)) add("matCable");
  else if (/bracket|mbajt|këmb|kemb/.test(label)) add("matBracket");
  else if (/drain|dren|zorr/.test(label)) add("matDrain");
  else if (/gas|gaz|refri|azot/.test(label)) add("matGas");
  else add("matOther");
}

/** Copy older calculator fields into the visible boxes once. Does not invent a selling price. */
export function migrateMoney(raw: Partial<JobRecord> & { kind?: string }): JobMoney {
  const money = emptyMoney();
  if (raw.kind === "service") {
    const job = raw as Partial<ServiceJob>;
    for (const row of job.materials ?? []) placeMaterial(row.name, lineAmount(row), money);
    const perKg = n(job.bottleKg) > 0 ? n(job.bottlePrice) / n(job.bottleKg) : 0;
    const gas = (n(job.refG) / 1000) * perKg;
    if (gas) money.matGas = field(n(money.matGas) + gas);
    const sell = job.repairAccepted ? n(job.repairPrice) : n(job.callOut);
    money.sellingPrice = field(sell);
    return money;
  }
  const job = raw as Partial<InstallJob>;
  if (job.includeUnit !== false) {
    const unit = job.cur === "EUR" ? n(job.unitPrice) * n(job.rate) : n(job.unitPrice);
    money.unitBuy = field(unit);
  }
  for (const row of [...(job.materials ?? []), ...(job.trunk ?? []), ...(job.consum ?? []), ...(job.other ?? [])]) {
    placeMaterial(row.name, lineAmount(row), money);
  }
  if (job.includeLabor !== false && job.laborCost !== false) money.extraHelper = field(n(job.labor));
  if (job.includeExtra !== false) money.matPipes = field(n(money.matPipes) + n(job.extraM) * n(job.extraRate));
  money.sellingPrice = field(job.sellOverride?.trim() ? n(job.sellOverride) : 0);
  return money;
}

export function withMoney(raw: Partial<JobRecord> & { kind?: string }): JobMoney {
  if (raw.money) return { ...emptyMoney(), ...raw.money };
  return migrateMoney(raw);
}
