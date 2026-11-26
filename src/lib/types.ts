export type Size = "12k" | "18k" | "24k";
export type OfferSize = "9k" | "12k" | "18k" | "24k" | "";
export type Pipe = "1/4" | "3/8" | "1/2" | "5/8" | "3/4";
export type Currency = "EUR" | "Lek";
export type JobStatus = "quote" | "scheduled" | "progress" | "done" | "paid";
export type JobKind = "install" | "service";
export type PhotoTag = "before" | "after" | "whatsapp" | "other";
export type Tone = "pos" | "neg" | "zero";
export type WallType = "tulle" | "gur" | "beton";

export type Row = {
  id: string;
  name: string;
  qty: string;
  price: string;
  vat: boolean;
  note?: string;
  /** Missing means included, so older saved jobs keep every line. */
  enabled?: boolean;
};

export type PriceBook = {
  labor: Record<Size, string>;
  package: Record<Size, string>;
  pipe: Record<Pipe, string>;
};

export type CalcInput = {
  title: string;
  size: Size;
  supplier: string;
  cur: Currency;
  unitPrice: string;
  rate: string;
  unitVat: boolean;
  labor: string;
  laborCost: boolean;
  vacOn: boolean;
  vac: string;
  materials: Row[];
  trunk: Row[];
  consum: Row[];
  other: Row[];
  extraM: string;
  extraRate: string;
  sellOverride: string;
  vatReg: boolean;
  taxRate: string;
  liquid: Pipe;
  gas: Pipe;
  km: string;
  fuel: string;
  cons: string;
  wear: string;
  fuelVat: boolean;
  inclFixed: boolean;
  depr: string;
  insYear: string;
  kmYear: string;
  refG: string;
  bottlePrice: string;
  bottleKg: string;
  refVat: boolean;
  refGpm: string;
  refExtraM: string;
  book: PriceBook;
  /** Missing means included, so older saved jobs keep the same totals. */
  includeUnit?: boolean;
  includeLabor?: boolean;
  includeTransport?: boolean;
  includeGas?: boolean;
  includeExtra?: boolean;
};

/** The only numbers used for profit. What you type here is the whole calculation. */
export type JobMoney = {
  unitBuy: string;
  matPipes: string;
  matInsulation: string;
  matCable: string;
  matBracket: string;
  matDrain: string;
  matGas: string;
  matOther: string;
  extraTravel: string;
  extraHelper: string;
  extraFloor: string;
  extraOther: string;
  vacuumCost: string;
  /** Legacy single selling price. New jobs use unitSell plus each line's sell. */
  sellingPrice: string;
  unitSell: string;
  matPipesSell: string;
  matCableSell: string;
  matBracketSell: string;
  matDrainSell: string;
  matOtherSell: string;
  extraTravelSell: string;
  extraOtherSell: string;
  targetMargin: string;
  tiers: { name: string; sell: string }[];
  /** One size for the whole job. It suggests labour and the package. It does not set the selling price. */
  size: "" | "9k" | "12k" | "18k" | "24k";
  /** Off until the installer chooses to count a wage. */
  payWage: boolean;
  /** Off until the installer counts the vacuum / nitrogen test. */
  vacuumOn: boolean;
  /** On: every cost on this job has a VAT invoice, so that VAT is deducted. */
  purchasesVat: boolean;
  /** Extra warranty years on the customer offer. Empty means none. */
  warrantyYears: string;
  /** Membership years chosen on the offer. Year 1 is included. */
  membershipYears: string;
  /** Missing on older quotes. Those open as one single split. */
  systems?: SplitSystem[];
};

export type LinePipe = Pipe;

export type IndoorUnit = {
  id: string;
  size: string;
  liquid: LinePipe;
  vapor: LinePipe;
  /** Shared run length. Liquid and vapor follow it until edited. */
  runM: string;
  liquidM: string;
  vaporM: string;
  cable3M: string;
  cable5M: string;
  drainM: string;
  liquidPrice: string;
  vaporPrice: string;
  cable3Price: string;
  cable5Price: string;
  drainPrice: string;
};

export type OutdoorUnit = {
  id: string;
  size: string;
  mount: "ground" | "wall";
  mountQty: string;
  mountPrice: string;
  indoors: IndoorUnit[];
};

export type SplitSystem = {
  id: string;
  kind: "single" | "multi";
  outdoors: OutdoorUnit[];
};

export type JobBase = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  date: string;
  status: JobStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Customer offer shows VAT lines only when this is true. Older jobs stay off. */
  showVatOnQuote?: boolean;
  /** Present after the simple form is used. Older jobs are filled in once on load. */
  money?: JobMoney;
};

export type InstallJob = JobBase &
  CalcInput & {
    kind: "install";
    brand: string;
    model: string;
    serial: string;
    btu: string;
    refrigerant: string;
    installDate: string;
  };

export type ServiceJob = JobBase & {
  kind: "service";
  problem: string;
  found: string;
  done: string;
  minutes: string;
  timerStartedAt: number | null;
  km: string;
  fuel: string;
  cons: string;
  wear: string;
  fuelVat: boolean;
  materials: Row[];
  refG: string;
  bottlePrice: string;
  bottleKg: string;
  refVat: boolean;
  callOut: string;
  halfHour: string;
  freeKm: string;
  perExtraKm: string;
  vatReg: boolean;
  taxRate: string;
  whatsappLog: string;
  repairAccepted: boolean;
  repairPrice: string;
  includeVisit?: boolean;
  includeTime?: boolean;
  includeTravel?: boolean;
  includeMaterials?: boolean;
  includeGas?: boolean;
  /** Missing on older jobs. Added disabled, so saved totals stay the same until one is checked. */
  repairOptions?: RepairOption[];
  /** Field readings for the system charge check. Missing on older jobs. */
  chargeReadings?: ChargeReading[];
};

export type ChargeRefrigerant = "R32" | "R410A" | "R22";
export type ChargeMode = "cooling" | "heating";
export type ChargeMetering = "exv" | "capillary" | "txv";
export type PressureUnit = "bar" | "psi";

export type ChargeReading = {
  id: string;
  at: string;
  refrigerant: ChargeRefrigerant;
  mode: ChargeMode;
  metering: ChargeMetering;
  pressureUnit: PressureUnit;
  suctionPressure: string;
  liquidPressure: string;
  suctionTemp: string;
  liquidTemp: string;
  returnAir: string;
  supplyAir: string;
  outdoorAmbient: string;
  wetBulb: string;
  compressorAmps: string;
  ratedAmps: string;
  lineSetM: string;
};

export type BookItem = {
  id: string;
  name: string;
  group: "unit" | "pipes" | "cable" | "bracket" | "drain" | "other" | "travel";
  buy: string;
  sell: string;
  size?: "" | "9k" | "12k" | "18k" | "24k";
};

export type WarrantyPackage = {
  id: string;
  name: string;
  price: string;
  detail: string;
};

/** Checkbox repair line. A price of 0 means the amount is still unknown. */
export type RepairOption = {
  id: string;
  name: string;
  price: string;
  enabled: boolean;
};

export type OfferLine = {
  id: string;
  name: string;
  qty: string;
  price: string;
};

export type Offer = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  date: string;
  size: OfferSize;
  lines: OfferLine[];
  showVat: boolean;
  packageIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Offers saved before the extended quote stay false so labour is not added on top of
   * a price the user already typed. New offers set this true.
   */
  pricingV2?: boolean;
  extraWarrantyYears?: number;
  /** 1–10. Year 1 is free with every installation. */
  membershipYears?: number;
  liftNeeded?: boolean;
  liftHours?: string;
  wallType?: WallType;
  holes?: string;
  extraPipeM?: string;
  floor?: string;
  /** True means Me ashensor (no per-floor surcharge). */
  elevator?: boolean;
  /**
   * Customer offer visibility by line key. Missing means shown.
   * False keeps the amount in the total but hides the line on print, share, copy and WhatsApp.
   * Membership lines use the key "membership". The VAT breakdown uses "vat".
   */
  customerVisible?: Record<string, boolean>;
};

export type JobRecord = InstallJob | ServiceJob;

export type Settings = {
  vatReg: boolean;
  taxRate: string;
  rate: string;
  labor: Record<Size, string>;
  package: Record<Size, string>;
  pipe: Record<Pipe, string>;
  cable3: string;
  cable5: string;
  drain: string;
  vacuum: string;
  trunkPerM: string;
  wall: string;
  corner: string;
  coupling: string;
  endCap: string;
  elbow: string;
  foam: string;
  silicone: string;
  fuel: string;
  cons: string;
  wear: string;
  depr: string;
  insYear: string;
  kmYear: string;
  bottlePrice: string;
  bottleKg: string;
  refGpm: string;
  extraRate: string;
  callOut: string;
  halfHour: string;
  freeKm: string;
  perExtraKm: string;
  companyPhone: string;
  warrantyPackages: WarrantyPackage[];
  /** Lek per extra warranty year. Default 25,000. */
  extraWarrantyYear: string;
  /** Lek per paid membership year. Default 6,000. */
  membershipYear: string;
  /** Lek per lift hour. Default 10,000. */
  liftHour: string;
  /** Lek per hole in stone or concrete. Default 13,000. */
  hardWallHole: string;
  /** Lek for one wall-bracket set. Editable in Settings. */
  mountWall: string;
  /** Lek for one ground base. Editable in Settings. */
  mountGround: string;
  /**
   * Lek per floor above ground when there is no elevator.
   * 1,000 is an editable placeholder until the owner confirms it.
   */
  floorSurcharge: string;
  /** True after the first-visit price has been moved off the old 4,000 Lek default. */
  visitPriceV2?: boolean;
  /** Default repair-option prices copied onto new service jobs. Unknown prices stay 0. */
  repairCatalog: RepairOption[];
  priceBook: BookItem[];
};

export type PhotoRecord = {
  id: string;
  jobId: string;
  caption: string;
  createdAt: string;
  tag: PhotoTag;
  blob: Blob;
};

export type Calc = {
  unitLek: number;
  costGross: number;
  inputVat: number;
  costReal: number;
  sell: number;
  sellDefault: number;
  netRev: number;
  outVat: number;
  vatPay: number;
  gross: number;
  margin: number;
  tax: number;
  net: number;
  breakEven: number;
  breakdown: { label: string; gross: number; vat: number }[];
};

export type BreakEvenRow = {
  size: Size;
  packageLek: number;
  profitNow: number;
  breakEven: number;
  plus2k: number;
};

export type ServiceCalc = {
  minutes: number;
  blocks: number;
  extraKm: number;
  callOut: number;
  timeCharge: number;
  kmCharge: number;
  visitFee: number;
  repair: number;
  visitCredit: number;
  materialsGross: number;
  materialsVat: number;
  gasGross: number;
  gasVat: number;
  repairOptionsGross: number;
  transportGross: number;
  transportVat: number;
  sell: number;
  costGross: number;
  inputVat: number;
  costReal: number;
  netRev: number;
  outVat: number;
  vatPay: number;
  gross: number;
  tax: number;
  net: number;
};
