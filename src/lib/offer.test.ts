import { describe, expect, it } from "vitest";
import { applyOfferSize, customerLines, inverterLabel, membershipBreakdown, offerShareText, quoteOffer, setCustomerVisible } from "./offer";
import { createOffer, defaultSettings, defaultWarrantyPackages, normalizeOffer } from "./defaults";
import type { Offer } from "./types";

describe("offer quote", () => {
  it("names the unit with Inverter and the BTU figure", () => {
    expect(inverterLabel("12k")).toBe("Kondicioner Inverter 12000 BTU");
    expect(inverterLabel("9k")).toBe("Kondicioner Inverter 9000 BTU");
    expect(inverterLabel("18k")).toContain("Inverter");
    expect(inverterLabel("24k")).toContain("24000");
    const next = applyOfferSize(createOffer(""), "18k");
    expect(next.lines[0].name).toBe("Kondicioner Inverter 18000 BTU");
    expect(next.pricingV2).toBe(true);
    expect(next.size).toBe("18k");
  });

  it("does not charge membership years already covered", () => {
    expect(membershipBreakdown(0, 1, 6000).charge).toBe(0);
    expect(membershipBreakdown(0, 3, 6000).chargeYears).toBe(2);
    expect(membershipBreakdown(0, 3, 6000).charge).toBe(12000);
    expect(membershipBreakdown(2, 3, 6000).charge).toBe(0);
    expect(membershipBreakdown(2, 5, 6000).chargeYears).toBe(2);
    expect(membershipBreakdown(2, 5, 6000).charge).toBe(12000);
  });

  it("keeps an old offer total and adds the new lines only on a v2 offer", () => {
    const settings = defaultSettings();
    const packages = defaultWarrantyPackages();
    const old: Offer = {
      id: "old",
      customerName: "Ana",
      phone: "",
      address: "",
      date: "2026-11-01",
      size: "12k",
      lines: [{ id: "l", name: "Kondicioner 12k", qty: "1", price: "80000" }],
      showVat: true,
      packageIds: ["abonimi"],
      notes: "",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    };
    expect(quoteOffer(normalizeOffer(old), settings, packages).gross).toBe(86000);

    const offer: Offer = {
      ...createOffer("12k"),
      lines: [{ id: "l", name: inverterLabel("12k"), qty: "1", price: "100000" }],
      extraWarrantyYears: 2,
      membershipYears: 5,
      liftNeeded: true,
      liftHours: "2",
      wallType: "beton",
      holes: "2",
      extraPipeM: "4",
      floor: "4",
      elevator: false,
      showVat: true,
    };
    const quote = quoteOffer(offer, settings, packages);
    expect(quote.lines.find((line) => line.key === "labor")?.gross).toBe(20500);
    expect(quote.lines.find((line) => line.key === "warranty")?.gross).toBe(50000);
    expect(quote.lines.find((line) => line.key === "member-free")?.gross).toBe(0);
    expect(quote.lines.find((line) => line.key === "member-paid")?.gross).toBe(12000);
    expect(quote.lines.find((line) => line.key === "lift")?.gross).toBe(20000);
    expect(quote.lines.find((line) => line.key === "wall")?.gross).toBe(26000);
    expect(quote.lines.find((line) => line.key === "pipe")?.gross).toBe(6000);
    expect(quote.lines.find((line) => line.key === "pipe")?.detail).toContain("3 m të përfshira");
    expect(quote.lines.find((line) => line.key === "floor")?.gross).toBe(3000);
    expect(quote.gross).toBe(237500);
    expect(quote.net).toBeCloseTo(237500 / 1.2, 5);
    expect(quote.vat).toBeCloseTo(237500 - 237500 / 1.2, 5);
  });

  it("uses 9k labour equal to 12k and charges stone holes, not brick", () => {
    const settings = defaultSettings();
    const brick = quoteOffer({ ...createOffer("9k"), wallType: "tulle", holes: "3" }, settings);
    const stone = quoteOffer({ ...createOffer("9k"), wallType: "gur", holes: "3" }, settings);
    expect(brick.lines.find((line) => line.key === "labor")?.gross).toBe(20500);
    expect(brick.lines.find((line) => line.key === "wall")?.gross).toBe(0);
    expect(stone.lines.find((line) => line.key === "wall")?.gross).toBe(39000);
    const ground = quoteOffer({ ...createOffer("24k"), floor: "1", elevator: false }, settings);
    const second = quoteOffer({ ...createOffer("24k"), floor: "2", elevator: false }, settings);
    const lifted = quoteOffer({ ...createOffer("18k"), floor: "5", elevator: true }, settings);
    expect(ground.lines.find((line) => line.key === "floor")?.gross).toBe(0);
    expect(second.lines.find((line) => line.key === "floor")?.gross).toBe(1000);
    expect(lifted.lines.find((line) => line.key === "labor")?.gross).toBe(22500);
    expect(lifted.lines.find((line) => line.key === "floor")?.gross).toBe(0);
    expect(quoteOffer(createOffer("24k"), settings).lines.find((line) => line.key === "labor")?.gross).toBe(23500);
  });

  it("keeps hidden lines in the total and drops them from the customer text", () => {
    const settings = defaultSettings();
    const offer = setCustomerVisible({ ...createOffer("12k"), showVat: true, extraWarrantyYears: 1 }, "labor", false);
    const full = quoteOffer(offer, settings);
    const shown = customerLines(offer, settings);
    expect(full.gross).toBe(20500 + 25000);
    expect(shown.some((line) => line.key === "labor")).toBe(false);
    expect(shown.some((line) => line.key === "warranty")).toBe(true);
    const text = offerShareText(offer, settings, [], "");
    expect(text).not.toContain("Kosto pune");
    expect(text).toContain("Garanci shtesë");
    expect(text).toContain("45,500 Lek");
    const hidden = ["labor", "warranty", "membership", "lift", "wall", "pipe", "floor", "vat"].reduce(
      (next, key) => setCustomerVisible(next, key, false),
      { ...createOffer("12k"), showVat: true, lines: [{ id: "unit", name: "Kondicioner Inverter 12000 BTU", qty: "1", price: "10000" }] },
    );
    const hiddenToo = setCustomerVisible(hidden, "unit", false);
    const quiet = offerShareText(hiddenToo, settings, [], "");
    expect(quiet).not.toContain("Kondicioner");
    expect(quiet).not.toContain("Kosto pune");
    expect(quiet).not.toContain("TVSH 20%");
    expect(quiet).toContain("Çmimi me TVSH");
    expect(quoteOffer(hiddenToo, settings).gross).toBe(10000 + 20500);
  });

  it("marks a missing extra-pipe price instead of inventing one", () => {
    const settings = { ...defaultSettings(), extraRate: "0" };
    const quote = quoteOffer({ ...createOffer("12k"), extraPipeM: "2" }, settings);
    const pipe = quote.lines.find((line) => line.key === "pipe");
    expect(pipe?.gross).toBe(0);
    expect(pipe?.needsValue).toBe(true);
    expect(pipe?.detail).toContain("3 m të përfshira");
  });
});
