import { formatDate, lek, num } from "./format";
import { membershipBreakdown } from "./offer";
import { emptyMoney, moneyTotals } from "./simple";
import { detailLines, summarize } from "./split";
import type { JobMoney, JobRecord, Settings } from "./types";

export type SheetLine = { label: string; amount: number; detail?: string; heading?: boolean };

const BTU: Record<Exclude<JobMoney["size"], "">, string> = {
  "9k": "9000",
  "12k": "12000",
  "18k": "18000",
  "24k": "24000",
};

export function jobDescription(job: JobRecord): string {
  const money = { ...emptyMoney(), ...job.money };
  const btu = money.size ? BTU[money.size] : "";
  const unit = btu ? `Kondicioner Inverter ${btu} BTU` : "";
  const brand = job.kind === "install" ? [job.brand, job.model].filter(Boolean).join(" ") : "";
  const service = job.kind === "service" ? job.problem : "";
  const summary = summarize(money.systems);
  return [unit, brand, service, summary].filter(Boolean).join(", ") || (job.kind === "service" ? "Servis" : "Montim");
}

export type CustomerView = {
  description: string;
  lines: SheetLine[];
  total: number;
  net: number;
  vat: number;
  showVat: boolean;
  tiers: { name: string; sell: string }[];
  date: string;
};

/** Customer sheet. Sell prices only. The headline stays the typed price when warranty years are 0. */
export function jobCustomerView(job: JobRecord, settings: Settings): CustomerView {
  const money = { ...emptyMoney(), ...job.money };
  const totals = moneyTotals(money);
  const description = jobDescription(job);
  const named: [string, string][] = [
    [description, money.unitSell || money.sellingPrice],
    ["Tuba dhe izolim", money.matPipesSell],
    ["Kabllo", money.matCableSell],
    ["Mbajtëse", money.matBracketSell],
    ["Drenazh", money.matDrainSell],
    ["Materiale të tjera", money.matOtherSell],
    ["Karburant / rrugë", money.extraTravelSell],
    ["Të tjera", money.extraOtherSell],
  ];
  const lines: SheetLine[] = named
    .filter(([, value]) => num(value) > 0)
    .map(([label, value]) => ({ label, amount: num(value) }));
  lines.push(...detailLines(money.systems));
  if (!lines.some((line) => !line.heading && line.amount > 0) && totals.sell > 0) lines.unshift({ label: description, amount: totals.sell });

  const years = Math.max(0, Math.floor(num(money.warrantyYears || "0")));
  const warrantyPrice = num(settings.extraWarrantyYear || "25000");
  const memberPrice = num(settings.membershipYear || "6000");
  const span = Math.max(1, Math.floor(num(money.membershipYears || "1")));
  const membership = membershipBreakdown(years, span, memberPrice);
  lines.push({
    label: years > 0 ? `Garanci shtesë ${years} vit` : "Garanci shtesë",
    amount: years * warrantyPrice,
    detail: years > 0 ? "Çdo vit përfshin abonimin vjetor falas." : "Pa vite shtesë.",
  });
  lines.push({
    label: "Abonim vjetor i përfshirë (1 vit)",
    amount: 0,
    detail: "Me instalimin. 1 larje dhe 1 mirëmbajtje.",
  });
  if (membership.chargeYears > 0) {
    lines.push({
      label: `Abonim vjetor me pagesë (${membership.chargeYears} vit)`,
      amount: membership.charge,
      detail: "Çdo vit: 1 larje dhe 1 mirëmbajtje.",
    });
  }

  const total = totals.sell + (totals.hasSell ? 0 : totals.detail) + years * warrantyPrice + membership.charge;
  const net = total / 1.2;
  return {
    description,
    lines,
    total,
    net,
    vat: total - net,
    showVat: job.showVatOnQuote === true,
    tiers: money.tiers.filter((tier) => tier.name.trim() || num(tier.sell) > 0),
    date: formatDate(job.date),
  };
}

export function customerShareText(input: {
  companyPhone: string;
  customerName: string;
  phone: string;
  address: string;
  date: string;
  description: string;
  lines: SheetLine[];
  total: number;
  net: number;
  vat: number;
  showVat: boolean;
}): string {
  const rows = input.lines.map((line) => {
    if (line.heading) return line.label;
    const detail = line.detail ? ` — ${line.detail}` : "";
    return `${line.label}: ${lek(line.amount)}${detail}`;
  });
  const totals = input.showVat
    ? [`Nëntotali pa TVSH: ${lek(input.net)}`, `TVSH 20%: ${lek(input.vat)}`, `Çmimi me TVSH: ${lek(input.total)}`]
    : [`Çmimi me TVSH: ${lek(input.total)}`];
  return [
    "L.C.P CLIMA",
    input.companyPhone ? `Tel: ${input.companyPhone}` : "",
    "OFERTË",
    `Klienti: ${input.customerName || "—"}`,
    input.phone ? `Telefoni: ${input.phone}` : "",
    input.address ? `Adresa: ${input.address}` : "",
    input.date ? `Data: ${input.date}` : "",
    input.description ? `Përshkrimi: ${input.description}` : "",
    ...rows,
    ...totals,
  ].filter((line) => line !== "").join("\n");
}
