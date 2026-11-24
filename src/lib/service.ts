import { num } from "./format";
import type { ServiceCalc, ServiceJob } from "./types";

/**
 * Customer price is VAT-inclusive when the company is VAT-registered.
 * Visit fee = call-out (first hour + free one-way km) + extra 30-min blocks + extra km.
 * Extra km are the round trip beyond the free one-way zone: 2 × max(0, one-way − zone).
 * If the repair is accepted, that visit fee is deducted and the customer pays the repair
 * price plus materials and gas. If not, they pay only the visit fee.
 * Driving cost is still the round trip × (fuel + wear). Wear has no deductible VAT.
 */
export function chargeableBlocks(minutes: number): number {
  if (!(minutes > 60)) return 0;
  return Math.ceil((minutes - 60) / 30 - 1e-9);
}

export function liveMinutes(job: Pick<ServiceJob, "minutes" | "timerStartedAt">, now = Date.now()): number {
  const base = Math.max(0, num(job.minutes));
  if (!job.timerStartedAt) return base;
  return base + Math.max(0, now - job.timerStartedAt) / 60000;
}

export function serviceCompute(job: ServiceJob, now = Date.now()): ServiceCalc {
  const minutes = liveMinutes(job, now);
  const blocks = chargeableBlocks(minutes);
  const callOut = num(job.callOut);
  const timeCharge = blocks * num(job.halfHour);
  const extraKm = 2 * Math.max(0, num(job.km) - num(job.freeKm));
  const kmCharge = extraKm * num(job.perExtraKm);

  let materialsGross = 0;
  let materialsVat = 0;
  if (job.includeMaterials !== false) {
    for (const row of job.materials) {
      if (row.enabled === false) continue;
      const g = num(row.qty) * num(row.price);
      materialsGross += g;
      if (job.vatReg && row.vat) materialsVat += g / 6;
    }
  }

  const perKg = num(job.bottleKg) > 0 ? num(job.bottlePrice) / num(job.bottleKg) : 0;
  const gasGross = job.includeGas === false ? 0 : (num(job.refG) / 1000) * perKg;
  const gasVat = job.vatReg && job.refVat ? gasGross / 6 : 0;

  const fuelPer = (num(job.cons) / 100) * num(job.fuel);
  const kmRound = 2 * num(job.km);
  const travelOn = job.includeTravel !== false;
  const transportGross = travelOn ? kmRound * (fuelPer + num(job.wear)) : 0;
  const transportVat = travelOn && job.vatReg && job.fuelVat ? (kmRound * fuelPer) / 6 : 0;

  const visitFee = (job.includeVisit === false ? 0 : callOut) + (job.includeTime === false ? 0 : timeCharge) + (travelOn ? kmCharge : 0);
  const repair = num(job.repairPrice);
  let repairOptionsGross = 0;
  for (const option of job.repairOptions ?? []) {
    if (!option.enabled) continue;
    repairOptionsGross += num(option.price);
  }
  const visitCredit = job.repairAccepted ? visitFee : 0;
  const sell = job.repairAccepted ? repair + repairOptionsGross + materialsGross + gasGross : visitFee;
  const costGross = transportGross + materialsGross + gasGross;
  const inputVat = transportVat + materialsVat + gasVat;
  const costReal = costGross - inputVat;
  const netRev = job.vatReg ? sell / 1.2 : sell;
  const outVat = sell - netRev;
  const vatPay = outVat - inputVat;
  const gross = netRev - costReal;
  const tax = gross > 0 ? (gross * num(job.taxRate)) / 100 : 0;
  const net = gross - tax;

  return {
    minutes,
    blocks,
    extraKm,
    callOut,
    timeCharge,
    kmCharge,
    visitFee,
    repair,
    visitCredit,
    materialsGross,
    materialsVat,
    gasGross,
    gasVat,
    repairOptionsGross,
    transportGross,
    transportVat,
    sell,
    costGross,
    inputVat,
    costReal,
    netRev,
    outVat,
    vatPay,
    gross,
    tax,
    net,
  };
}
