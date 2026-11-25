import { num } from "./format";
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
    sellingPrice: "",
  };
}

export type MoneyTotals = {
  materials: number;
  extras: number;
  cost: number;
  sell: number;
  profit: number;
  margin: number;
};

/** Profit is the selling price minus every cost on the form. Nothing else is added. */
export function moneyTotals(money: JobMoney | undefined): MoneyTotals {
  const m = { ...emptyMoney(), ...money };
  const materials = num(m.matPipes) + num(m.matInsulation) + num(m.matCable) + num(m.matBracket) + num(m.matDrain) + num(m.matGas) + num(m.matOther);
  const extras = num(m.extraTravel) + num(m.extraHelper) + num(m.extraFloor) + num(m.extraOther);
  const cost = num(m.unitBuy) + materials + extras;
  const sell = num(m.sellingPrice);
  const profit = sell - cost;
  const margin = sell > 0 ? (profit / sell) * 100 : 0;
  return { materials, extras, cost, sell, profit, margin };
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
  const add = (key: keyof JobMoney) => {
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
