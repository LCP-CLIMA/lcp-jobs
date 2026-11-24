export type Orientation = "N" | "E" | "S" | "W";
export type Insulation = "good" | "average" | "poor";
export type FloorPlace = "middle" | "ground" | "top";
export type RecommendSize = "9k" | "12k" | "18k" | "24k";

export type WindowInput = { width: string; height: string; orientation: Orientation };

export type BtuInput = {
  area: string;
  length: string;
  width: string;
  height: string;
  windows: WindowInput[];
  insulation: Insulation;
  people: string;
  kitchen: boolean;
  floor: FloorPlace;
};

const BASE_W: Record<Insulation, number> = { good: 80, average: 110, poor: 150 };
const GLASS_W: Record<Orientation, number> = { N: 50, E: 90, S: 130, W: 150 };

function n(value: string): number {
  const v = parseFloat((value || "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export function roomArea(input: BtuInput): number {
  if (n(input.area) > 0) return n(input.area);
  return n(input.length) * n(input.width);
}

/** Estimate for a Shkodër summer. It is a sizing guide, not a room-by-room heat-loss survey. */
export function estimateLoad(input: BtuInput): { watts: number; btu: number; size: RecommendSize; over: boolean } {
  const area = roomArea(input);
  const height = n(input.height) > 0 ? n(input.height) : 2.6;
  const heightFactor = Math.max(1, height / 2.6);
  const floorFactor = input.floor === "top" ? 1.15 : input.floor === "ground" ? 1.05 : 1;
  let watts = area * BASE_W[input.insulation] * heightFactor * floorFactor;
  for (const window of input.windows) {
    watts += n(window.width) * n(window.height) * GLASS_W[window.orientation];
  }
  watts += Math.max(0, n(input.people)) * 100;
  if (input.kitchen) watts += 700;
  const btu = watts * 3.412;
  const size: RecommendSize = btu <= 9000 ? "9k" : btu <= 12000 ? "12k" : btu <= 18000 ? "18k" : "24k";
  return { watts, btu, size, over: btu > 24000 };
}
