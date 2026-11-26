import { PAIR, btuFor, pipeName } from "./calc";
import { todayISO } from "./format";
import { inverterLabel } from "./offer";
import { emptyMoney, withMoney } from "./simple";
import { freshSingle } from "./split";
import { normalizeServiceStatus } from "./status";
import type { BookItem, InstallJob, JobRecord, Offer, OfferSize, PriceBook, RepairOption, Row, ServiceJob, Settings, Size, WarrantyPackage } from "./types";

export const FACTORY_BOOK: PriceBook = {
  labor: { "12k": "10000", "18k": "12000", "24k": "13000" },
  package: { "12k": "20500", "18k": "22500", "24k": "23500" },
  pipe: { "1/4": "255", "3/8": "355", "1/2": "510", "5/8": "820", "3/4": "" },
};

export function defaultSettings(): Settings {
  return {
    vatReg: true,
    taxRate: "0",
    rate: "90.17",
    labor: { ...FACTORY_BOOK.labor },
    package: { ...FACTORY_BOOK.package },
    pipe: { ...FACTORY_BOOK.pipe },
    cable3: "130",
    cable5: "130",
    drain: "60",
    vacuum: "6000",
    trunkPerM: "700",
    wall: "500",
    corner: "250",
    coupling: "150",
    endCap: "250",
    elbow: "300",
    foam: "320",
    silicone: "240",
    fuel: "201",
    cons: "8",
    wear: "5.4",
    depr: "3.7",
    insYear: "0",
    kmYear: "15000",
    bottlePrice: "12500",
    bottleKg: "10",
    refGpm: "20",
    extraRate: "1500",
    callOut: "3000",
    halfHour: "2000",
    freeKm: "15",
    perExtraKm: "30",
    companyPhone: "",
    warrantyPackages: defaultWarrantyPackages(),
    extraWarrantyYear: "25000",
    membershipYear: "6000",
    liftHour: "10000",
    hardWallHole: "13000",
    floorSurcharge: "1000",
    visitPriceV2: true,
    repairCatalog: defaultRepairCatalog(),
    priceBook: defaultPriceBook(),
  };
}

export function defaultPriceBook(): BookItem[] {
  const units = (["9k", "12k", "18k", "24k"] as const).map((size) => ({
    id: `unit-${size}`,
    name: `Kondicioner ${size}`,
    group: "unit" as const,
    buy: "",
    sell: "",
    size,
  }));
  return [
    ...units,
    { id: "pipes", name: "Set tubash + izolim", group: "pipes", buy: "", sell: "" },
    { id: "cable", name: "Kabllo", group: "cable", buy: "", sell: "" },
    { id: "bracket", name: "Mbajtëse", group: "bracket", buy: "", sell: "" },
    { id: "drain", name: "Drenazh", group: "drain", buy: "", sell: "" },
  ];
}

export function defaultRepairCatalog(): RepairOption[] {
  const names = [
    ["kondensator-motorri", "Kondensator motorri"],
    ["kondensator-ventilatori", "Kondensator ventilatori"],
    ["mbushje-gaz", "Mbushje me gaz"],
    ["test-azot", "Test presioni me azot"],
    ["saldim-rrjedhje", "Gjetje, riparim dhe saldim rrjedhjesh në tuba"],
    ["kontroll-elektrik", "Kontroll elektrik"],
    ["kontroll-drenazhi", "Kontroll drenazhi"],
    ["kontroll-performance", "Kontroll performance"],
  ] as const;
  return names.map(([id, name]) => ({ id, name, price: "0", enabled: false }));
}

export function mergeRepairOptions(saved: RepairOption[] | undefined, catalog = defaultRepairCatalog()): RepairOption[] {
  const byId = new Map((saved ?? []).map((item) => [item.id, item]));
  const known = catalog.map((item) => {
    const prev = byId.get(item.id);
    if (!prev) return { ...item, enabled: false };
    return { ...item, name: prev.name || item.name, price: prev.price ?? item.price, enabled: prev.enabled === true };
  });
  const extra = (saved ?? []).filter((item) => !catalog.some((entry) => entry.id === item.id));
  return [...known, ...extra];
}

export function defaultWarrantyPackages(): WarrantyPackage[] {
  return [
    {
      id: "baze",
      name: "Bazë",
      price: "20500",
      detail: "Punë + kit 3 m. 12k 20,500 · 18k 22,500 · 24k 23,500 Lek, TVSH e përfshirë. Ndrysho çmimin për madhësinë e kësaj oferte.",
    },
    {
      id: "plus",
      name: "Plus",
      price: "27000",
      detail: "Bazë + 2 m tub, WiFi, 1 pastrim në muajin 12, 3 vjet garanci pune. 12k 27,000 · 18k 29,000 · 24k 30,000 Lek.",
    },
    {
      id: "abonimi",
      name: "Abonim vjetor",
      price: "6000",
      detail: "Pastrim dhe kontroll elektrik, prioritet në telefon. 6,000 Lek në vit.",
    },
  ];
}

export function createOffer(size: Offer["size"] = ""): Offer {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    customerName: "",
    phone: "",
    address: "",
    date: todayISO(),
    size,
    lines: [{ id: crypto.randomUUID(), name: inverterLabel(size), qty: "1", price: "" }],
    showVat: false,
    packageIds: [],
    notes: size === "9k" ? "9k përdor të njëjtën kosto pune si 12k: 20,500 Lek." : "",
    createdAt: now,
    updatedAt: now,
    pricingV2: true,
    extraWarrantyYears: 0,
    membershipYears: 1,
    liftNeeded: false,
    liftHours: "1",
    wallType: "tulle",
    holes: "1",
    extraPipeM: "0",
    floor: "0",
    elevator: true,
  };
}

export function normalizeOffer(raw: Partial<Offer> | null | undefined): Offer {
  const size = (raw?.size ?? "") as OfferSize;
  const fresh = createOffer(size);
  if (!raw) return fresh;
  return {
    ...fresh,
    ...raw,
    size,
    lines: raw.lines?.length ? raw.lines : fresh.lines,
    packageIds: raw.packageIds ?? [],
    showVat: raw.showVat === true,
    pricingV2: raw.pricingV2 === true,
    extraWarrantyYears: Math.max(0, Math.floor(raw.extraWarrantyYears ?? 0)),
    membershipYears: Math.min(10, Math.max(1, Math.floor(raw.membershipYears ?? 1))),
    liftNeeded: raw.liftNeeded === true,
    liftHours: raw.liftHours ?? "1",
    wallType: raw.wallType === "gur" || raw.wallType === "beton" ? raw.wallType : "tulle",
    holes: raw.holes ?? "1",
    extraPipeM: raw.extraPipeM ?? "0",
    floor: raw.floor ?? "0",
    elevator: raw.elevator !== false,
    customerVisible: raw.customerVisible ?? {},
  };
}

function row(id: string, name: string, qty: string, price: string, vat: boolean, note?: string): Row {
  return { id, name, qty, price, vat, note };
}

export function bookOf(settings: Settings): PriceBook {
  return {
    labor: { ...settings.labor },
    package: { ...settings.package },
    pipe: { ...settings.pipe },
  };
}

export function buildMaterials(settings: Settings, size: Size): Row[] {
  const [liquid, gas] = PAIR[size];
  return [
    row("m1", pipeName("liquid", liquid), "3", settings.pipe[liquid], true),
    row("m5", pipeName("gas", gas), "3", settings.pipe[gas], true),
    row("m2", "Cable 3x2.5 mm (kabllo 3x2.5), m. 0 = not used", "3", settings.cable3, true),
    row("m6", "Cable 5x1.5 mm (kabllo 5x1.5), m. 0 = not used", "3", settings.cable5, true),
    row("m3", "Drain hose (zorrë shkarkimi), m. 0 = not used", "3", settings.drain, true),
    row("m4", "Outdoor bracket (mbajtëse / këmbë)", "1", "0", true),
  ];
}

export function buildTrunk(settings: Settings): Row[] {
  return [
    row("t1", "Trunking (kanalinë), metres. Minimum 3 m", "3", settings.trunkPerM, true),
    row("t2", "Wall outlet, round flange (dalje muri me fllanxhë rrethore)", "1", settings.wall, true),
    row("t3", "Corner outlet (dalje këndore)", "0", settings.corner, true),
    row("t4", "Coupling (manikotë)", "1", settings.coupling, true),
    row("t5", "End cap (mbyllje fundore)", "1", settings.endCap, true),
    row("t6", "Plain elbow (bërryl i thjeshtë)", "1", settings.elbow, true),
  ];
}

export function buildConsum(settings: Settings): Row[] {
  return [
    row("c1", "Zip ties (shirita plastike)", "0", "0", true),
    row("c2", "Expanding foam (shkumë poliuretani)", "1", settings.foam, true, "Sinani: Tytan PU foam 300 ml, 320 Lek"),
    row("c3", "Screws + wall plugs (vida + upa)", "0", "0", true),
    row("c4", "PVC / insulation tape (shirit izolues)", "0", "0", true),
    row("c5", "Silicone / sealant (silikon)", "1", settings.silicone, true, "Sinani: Tytan acrylic white 300 ml, 240 Lek"),
    row("c6", "Wall-hole sealing putty (stuko / mastik)", "0", "0", true),
    row("c7", "Drain fittings (rakorderi drenazhi)", "0", "0", true),
    row("c8", "Cable lugs / terminals (kapikorda)", "0", "0", true),
    row("c9", "Rawl bolts for bracket (bulona / upa metalike)", "0", "0", true),
    row("c10", "Anti-vibration pads (amortizatorë)", "0", "0", true),
    row("c11", "Nitrogen / brazing consumables (azot / saldim)", "0", "0", true),
    row("c12", "Other consumable (të tjera)", "0", "0", true),
  ];
}

export function buildOther(): Row[] {
  return [
    row("o3", "Helper (ndihmës)", "0", "0", false),
    row("o4", "Other (të tjera)", "0", "0", false),
  ];
}

function stamp(id?: string): Pick<JobRecord, "id" | "createdAt" | "updatedAt"> {
  const now = new Date().toISOString();
  return { id: id ?? crypto.randomUUID(), createdAt: now, updatedAt: now };
}

export function createInstallJob(settings: Settings, id?: string): InstallJob {
  const book = bookOf(settings);
  const size: Size = "12k";
  const [liquid, gas] = PAIR[size];
  return {
    ...stamp(id),
    kind: "install",
    customerName: "",
    phone: "",
    address: "",
    date: todayISO(),
    status: "quote",
    notes: "",
    brand: "",
    model: "",
    serial: "",
    btu: btuFor(size),
    refrigerant: "",
    installDate: "",
    title: "",
    size,
    supplier: "",
    cur: "EUR",
    unitPrice: "",
    rate: settings.rate,
    unitVat: true,
    labor: book.labor[size],
    laborCost: true,
    vacOn: true,
    vac: settings.vacuum,
    materials: buildMaterials(settings, size),
    trunk: buildTrunk(settings),
    consum: buildConsum(settings),
    other: buildOther(),
    extraM: "0",
    extraRate: settings.extraRate,
    sellOverride: "",
    vatReg: settings.vatReg,
    taxRate: settings.taxRate,
    liquid,
    gas,
    km: "0",
    fuel: settings.fuel,
    cons: settings.cons,
    wear: settings.wear,
    fuelVat: true,
    inclFixed: false,
    depr: settings.depr,
    insYear: settings.insYear,
    kmYear: settings.kmYear,
    refG: "0",
    bottlePrice: settings.bottlePrice,
    bottleKg: settings.bottleKg,
    refVat: true,
    refGpm: settings.refGpm,
    refExtraM: "0",
    book,
    money: { ...emptyMoney(), size: "12k", systems: [freshSingle(settings)] },
  };
}

export function hitachiExample(): InstallJob {
  const settings = defaultSettings();
  const job = createInstallJob(settings, "example-hitachi-12k");
  return {
    ...job,
    customerName: "Example — Hitachi airHome 400",
    title: "Example: Hitachi airHome 400 12k (Sinani)",
    date: "2026-11-22",
    status: "quote",
    supplier: "Sinani",
    cur: "EUR",
    unitPrice: "696.15",
    rate: "90.17",
    brand: "Hitachi",
    model: "airHome 400",
    btu: "12000",
    km: "10",
    notes:
      "Sample install with the default price list. 10 km one way, no refrigerant, both cables 3 m, trunking 3 m × 700 Lek. Delete when you no longer need it.",
    createdAt: "2026-11-22T09:00:00.000Z",
    updatedAt: "2026-11-22T09:00:00.000Z",
  };
}

export function profitExample(): InstallJob {
  const job = hitachiExample();
  return {
    ...job,
    id: "example-profit-12k",
    customerName: "Example — profit (shembull fitimi)",
    title: "Example: same costs, selling price 95,000 Lek",
    sellOverride: "95000",
    status: "paid",
    notes:
      "Same default costs as the Hitachi example, with the selling price set to 95,000 Lek so this card shows a profit in green. Delete when you no longer need it.",
    createdAt: "2026-11-22T09:05:00.000Z",
    updatedAt: "2026-11-22T09:05:00.000Z",
  };
}

export function blankServiceRow(): Row {
  return row(crypto.randomUUID(), "", "1", "0", true);
}

export function createServiceJob(settings: Settings, id?: string): ServiceJob {
  return {
    ...stamp(id),
    kind: "service",
    customerName: "",
    phone: "",
    address: "",
    date: todayISO(),
    status: "quote",
    notes: "",
    problem: "",
    found: "",
    done: "",
    minutes: "0",
    timerStartedAt: null,
    km: "0",
    fuel: settings.fuel,
    cons: settings.cons,
    wear: settings.wear,
    fuelVat: true,
    materials: [blankServiceRow()],
    refG: "0",
    bottlePrice: settings.bottlePrice,
    bottleKg: settings.bottleKg,
    refVat: true,
    callOut: settings.callOut,
    halfHour: settings.halfHour,
    freeKm: settings.freeKm,
    perExtraKm: settings.perExtraKm,
    vatReg: settings.vatReg,
    taxRate: settings.taxRate,
    whatsappLog: "",
    repairAccepted: false,
    repairPrice: "0",
    repairOptions: mergeRepairOptions(settings.repairCatalog).map((item) => ({ ...item, enabled: false })),
    money: emptyMoney(),
  };
}

export function exampleService(): ServiceJob {
  const settings = defaultSettings();
  return {
    ...createServiceJob(settings, "example-service-call"),
    customerName: "Example — service call (shembull)",
    date: "2026-11-22",
    status: "scheduled",
    problem: "Nuk ftoh si duhet (shembull).",
    found: "Filtra të bllokuar. Shembull, jo një punë reale.",
    done: "Pastrim i filtrave. Shembull.",
    minutes: "75",
    km: "10",
    materials: [],
    whatsappLog: "Klienti dërgoi një video të filtrit. Shembull, jo një punë reale.",
    repairAccepted: false,
    repairPrice: "0",
    notes:
      "Sample service call. 10 km is inside the 15 km zone. 75 minutes is the first hour plus one extra half hour: 3,000 + 2,000 Lek. Delete when you no longer need it.",
    createdAt: "2026-11-22T09:10:00.000Z",
    updatedAt: "2026-11-22T09:10:00.000Z",
  };
}

export function isService(job: JobRecord): job is ServiceJob {
  return job.kind === "service";
}

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const base = defaultSettings();
  if (!raw) return base;
  const merged: Settings = {
    ...base,
    ...raw,
    labor: { ...base.labor, ...raw.labor },
    package: { ...base.package, ...raw.package },
    pipe: { ...base.pipe, ...raw.pipe },
    warrantyPackages: raw.warrantyPackages?.length ? raw.warrantyPackages : base.warrantyPackages,
    repairCatalog: mergeRepairOptions(raw.repairCatalog, base.repairCatalog),
    priceBook: raw.priceBook?.length ? raw.priceBook : base.priceBook,
    extraWarrantyYear: raw.extraWarrantyYear || base.extraWarrantyYear,
    membershipYear: raw.membershipYear || base.membershipYear,
    liftHour: raw.liftHour || base.liftHour,
    hardWallHole: raw.hardWallHole || base.hardWallHole,
    floorSurcharge: raw.floorSurcharge || base.floorSurcharge,
  };
  if (raw.visitPriceV2 !== true && (raw.callOut == null || raw.callOut === "" || raw.callOut === "4000")) {
    merged.callOut = base.callOut;
  }
  merged.visitPriceV2 = true;
  return merged;
}

export function normalizeJob(raw: Partial<JobRecord> & { kind?: string }): JobRecord {
  if (raw.kind === "service") {
    const base = createServiceJob(defaultSettings(), raw.id);
    const service = raw as Partial<ServiceJob>;
    return {
      ...base,
      ...service,
      kind: "service",
      status: normalizeServiceStatus(service.status),
      materials: service.materials ?? base.materials,
      timerStartedAt: service.timerStartedAt ?? null,
      repairOptions: mergeRepairOptions(service.repairOptions),
      money: withMoney({ ...service, kind: "service" }),
    };
  }
  const base = createInstallJob(defaultSettings(), raw.id);
  const install = raw as Partial<InstallJob>;
  return {
    ...base,
    ...install,
    kind: "install",
    status: normalizeServiceStatus(install.status),
    book: {
      labor: { ...base.book.labor, ...install.book?.labor },
      package: { ...base.book.package, ...install.book?.package },
      pipe: { ...base.book.pipe, ...install.book?.pipe },
    },
    materials: install.materials?.length ? install.materials : base.materials,
    trunk: install.trunk?.length ? install.trunk : base.trunk,
    consum: install.consum?.length ? install.consum : base.consum,
    other: install.other?.length ? install.other : base.other,
    money: withMoney({ ...install, kind: "install" }),
  };
}
