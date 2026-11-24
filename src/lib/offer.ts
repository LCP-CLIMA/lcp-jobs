import { num, lek } from "./format";
import type { Offer, OfferSize, Settings, WallType, WarrantyPackage } from "./types";

export type QuoteLine = {
  key: string;
  label: string;
  gross: number;
  detail?: string;
  needsValue?: boolean;
};

const BTU: Record<Exclude<OfferSize, "">, string> = {
  "9k": "9000",
  "12k": "12000",
  "18k": "18000",
  "24k": "24000",
};

export function inverterLabel(size: OfferSize): string {
  if (!size) return "";
  return `Kondicioner Inverter ${BTU[size]} BTU`;
}

/** Customer labour for an offer. 9k uses the same figure as 12k. */
export function laborGross(size: OfferSize, settings: Settings): number {
  if (size === "9k" || size === "12k") return num(settings.package["12k"] || "20500");
  if (size === "18k") return num(settings.package["18k"] || "22500");
  if (size === "24k") return num(settings.package["24k"] || "23500");
  return 0;
}

export function applyOfferSize(offer: Offer, size: OfferSize): Offer {
  const name = inverterLabel(size);
  const lines = offer.lines.length
    ? offer.lines.map((line, index) => (index === 0 ? { ...line, name: name || line.name } : line))
    : [{ id: crypto.randomUUID(), name, qty: "1", price: "" }];
  return { ...offer, size, lines, pricingV2: true };
}

export type MembershipBreakdown = {
  span: number;
  warrantyYears: number;
  chargeYears: number;
  includedYears: number;
  charge: number;
  detail: string;
};

/**
 * Year 1 of membership is free with the installation.
 * Each extra warranty year also includes that year's membership free.
 * Only years beyond both of those are charged.
 */
export function membershipBreakdown(extraWarrantyYears: number, membershipYears: number, yearPrice: number): MembershipBreakdown {
  const warrantyYears = Math.max(0, Math.floor(extraWarrantyYears) || 0);
  const span = Math.min(10, Math.max(1, Math.floor(membershipYears) || 1));
  const covered = 1 + warrantyYears;
  const chargeYears = Math.max(0, span - covered);
  const includedYears = Math.min(span, covered);
  const priceText = `${Math.round(yearPrice).toLocaleString("en-US")} Lek`;
  let detail = `Zgjedhur ${span} vit. 1 viti i parë është falas me instalimin (1 larje dhe 1 mirëmbajtje).`;
  if (warrantyYears > 0) detail += ` ${warrantyYears} vit garanci shtesë përfshijnë abonimin vjetor falas.`;
  if (chargeYears === 0) detail += " Nuk ka vite abonimi për t'u paguar.";
  else detail += ` ${chargeYears} vit me pagesë × ${priceText}. Çdo vit: 1 larje dhe 1 mirëmbajtje.`;
  return { span, warrantyYears, chargeYears, includedYears, charge: chargeYears * yearPrice, detail };
}

export function floorSurcharge(floor: number, elevator: boolean, perFloor: number): number {
  if (elevator) return 0;
  const above = Math.max(0, Math.floor(floor) - 1);
  return above * perFloor;
}

export function wallCharge(wall: WallType, holes: number, perHole: number): number {
  if (wall === "tulle") return 0;
  return Math.max(0, holes) * perHole;
}

export type OfferQuote = {
  lines: QuoteLine[];
  gross: number;
  net: number;
  vat: number;
};

export function shownAmount(gross: number, showVat: boolean): number {
  return showVat ? gross : gross / 1.2;
}

function wallLabel(wall: WallType): string {
  if (wall === "gur") return "Mur guri";
  if (wall === "beton") return "Beton";
  return "Tullë";
}

export function quoteOffer(offer: Offer, settings: Settings, packages: WarrantyPackage[] = []): OfferQuote {
  const lines: QuoteLine[] = [];
  offer.lines.forEach((line, index) => {
    lines.push({
      key: line.id || `line-${index}`,
      label: `${line.name || "Artikull"} × ${line.qty || "0"}`,
      gross: num(line.qty) * num(line.price),
    });
  });

  const v2 = offer.pricingV2 === true;
  const years = Math.max(0, Math.floor(offer.extraWarrantyYears ?? 0));
  const warrantyPrice = num(settings.extraWarrantyYear || "25000");
  const memberPrice = num(settings.membershipYear || "6000");
  const membership = membershipBreakdown(years, offer.membershipYears ?? 1, memberPrice);
  const liftOn = offer.liftNeeded === true;
  const liftHours = Math.max(0, num(offer.liftHours ?? "0"));
  const liftRate = num(settings.liftHour || "10000");
  const wall = offer.wallType ?? "tulle";
  const holes = Math.max(0, num(offer.holes ?? "1"));
  const holeRate = num(settings.hardWallHole || "13000");
  const extraM = Math.max(0, num(offer.extraPipeM ?? "0"));
  const pipeRate = num(settings.extraRate);
  const floor = Math.floor(num(offer.floor ?? "0"));
  const elevator = offer.elevator !== false;
  const perFloor = num(settings.floorSurcharge || "1000");
  const floorsAbove = elevator ? 0 : Math.max(0, floor - 1);

  if (v2 && offer.size) {
    lines.push({
      key: "labor",
      label: `Kosto pune ${offer.size}`,
      gross: laborGross(offer.size, settings),
      detail: "Vendoset nga madhësia. 9k dhe 12k 20,500 · 18k 22,500 · 24k 23,500 Lek.",
    });
  }
  if (v2 || years > 0) {
    lines.push({
      key: "warranty",
      label: `Garanci shtesë ${years} vit`,
      gross: years * warrantyPrice,
      detail: years > 0 ? "Çdo vit përfshin abonimin vjetor falas." : "Pa garanci shtesë.",
    });
  }
  if (v2 || membership.charge > 0) {
    lines.push({
      key: "member-free",
      label: "Abonim vjetor i përfshirë (1 vit)",
      gross: 0,
      detail: "Me instalimin. 1 larje dhe 1 mirëmbajtje. 0 Lek.",
    });
    lines.push({
      key: "member-paid",
      label: `Abonim vjetor me pagesë (${membership.chargeYears} vit)`,
      gross: membership.charge,
      detail: membership.detail,
    });
  }
  if (v2 || liftOn) {
    lines.push({
      key: "lift",
      label: liftOn ? `Vinç/Lift ${liftHours} orë` : "Vinç/Lift nuk duhet",
      gross: liftOn ? liftHours * liftRate : 0,
      detail: liftOn ? `${Math.round(liftRate).toLocaleString("en-US")} Lek për orë.` : "",
    });
  }
  if (v2 || wall !== "tulle") {
    lines.push({
      key: "wall",
      label: wall === "tulle" ? "Muri: Tullë" : `Muri: ${wallLabel(wall)}, ${holes} gropë`,
      gross: wallCharge(wall, holes, holeRate),
      detail: wall === "tulle" ? "Pa shtesë." : `${Math.round(holeRate).toLocaleString("en-US")} Lek për gropë.`,
    });
  }
  if (v2 || extraM > 0) {
    lines.push({
      key: "pipe",
      label: `Tub shtesë ${extraM} m`,
      gross: extraM * pipeRate,
      detail: "3 m të përfshira.",
      needsValue: extraM > 0 && pipeRate <= 0,
    });
  }
  if (v2 || !elevator || floor > 1) {
    lines.push({
      key: "floor",
      label: elevator ? `Kati ${floor || 0} · Me ashensor` : `Kati ${floor || 0} · Pa ashensor`,
      gross: floorSurcharge(floor, elevator, perFloor),
      detail: elevator
        ? "Pa shtesë."
        : `${floorsAbove} kat mbi tokë × ${Math.round(perFloor).toLocaleString("en-US")} Lek. Çmim i përkohshëm.`,
      needsValue: !elevator && floorsAbove > 0 && perFloor <= 0,
    });
  }

  for (const pack of packages) {
    if (!offer.packageIds?.includes(pack.id)) continue;
    lines.push({ key: `pack-${pack.id}`, label: pack.name, gross: num(pack.price), detail: pack.detail });
  }

  const gross = lines.reduce((sum, line) => sum + line.gross, 0);
  const net = gross / 1.2;
  const vat = gross - net;
  return { lines, gross, net, vat };
}

export function offerShareText(offer: Offer, settings: Settings, packages: WarrantyPackage[], phone: string): string {
  const quote = quoteOffer(offer, settings, packages);
  const rows = quote.lines.map((line) => {
    const detail = line.detail ? ` — ${line.detail}` : "";
    return `${line.label}: ${lek(shownAmount(line.gross, offer.showVat))}${detail}`;
  });
  const total = offer.showVat
    ? [`Nëntotali pa TVSH: ${lek(quote.net)}`, `TVSH 20%: ${lek(quote.vat)}`, `Totali me TVSH: ${lek(quote.gross)}`]
    : [`Çmimi: ${lek(quote.net)}`];
  return [
    "LCP Clima",
    phone || "",
    "OFERTË",
    `Klienti: ${offer.customerName || "—"}`,
    offer.phone ? `Telefoni: ${offer.phone}` : "",
    offer.address ? `Adresa: ${offer.address}` : "",
    offer.date ? `Data: ${offer.date}` : "",
    offer.size ? `Madhësia: ${offer.size}` : "",
    ...rows,
    ...total,
  ].filter((line) => line !== "").join("\n");
}

export function whatsappHref(text: string, phone?: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
