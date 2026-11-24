import { describe, expect, it } from "vitest";
import { blankChargeReading } from "./charge";
import { draftFromFieldpiece, parseFieldpieceText } from "./fieldpiece";

const IMPERIAL = `
Fieldpiece Job Link
Refrigerant R410A
Mode cooling
Suction Pressure 118.4 psi
Liquid Pressure 340.2 psi
Suction Line Temp 55.0 °F
Liquid Line Temp 95.0 °F
Return DB 76.0 °F
Supply DB 58.0 °F
Return WB 64.0 °F
Outdoor Ambient 86.0 °F
Odd Sensor 12.4 xyz
`;

describe("Fieldpiece parser", () => {
  it("converts a psi and fahrenheit report into bar and celsius", () => {
    const draft = draftFromFieldpiece(IMPERIAL, blankChargeReading());
    expect(draft.reading.refrigerant).toBe("R410A");
    expect(draft.reading.mode).toBe("cooling");
    expect(draft.reading.pressureUnit).toBe("bar");
    expect(Number(draft.reading.suctionPressure)).toBeCloseTo(118.4 / 14.5038, 2);
    expect(Number(draft.reading.liquidPressure)).toBeCloseTo(340.2 / 14.5038, 2);
    expect(Number(draft.reading.suctionTemp)).toBeCloseTo(((55 - 32) * 5) / 9, 1);
    expect(Number(draft.reading.returnAir)).toBeCloseTo(((76 - 32) * 5) / 9, 1);
    expect(draft.notes.join(" ")).toContain("Odd Sensor");
    expect(JSON.stringify(draft)).not.toMatch(/°F|Fahrenheit|Kelvin/);
  });

  it("keeps celsius and bar values and leaves unknown fields blank", () => {
    const text = `
Refrigerant: R32
Suction pressure: 7.6 bar
Liquid pressure: 24.1 bar
Suction line temperature: 12.4 °C
Liquid line temperature: 38.2 °C
Return air: 24 °C
Supply air: 14 °C
Ambient: 32 °C
`;
    const draft = draftFromFieldpiece(text, blankChargeReading());
    expect(draft.reading.suctionPressure).toBe("7.6");
    expect(draft.reading.liquidPressure).toBe("24.1");
    expect(draft.reading.suctionTemp).toBe("12.4");
    expect(draft.reading.supplyAir).toBe("14");
    expect(draft.reading.wetBulb).toBe("");
    expect(draft.notes.some((note) => note.includes("Wet bulb"))).toBe(true);
  });

  it("derives pressure from a saturation temperature when the gauge value is missing", () => {
    const parsed = parseFieldpieceText("Refrigerant R32\nVapor Saturation 0 °C\n");
    expect(parsed.values.evapSat?.value).toBe(0);
    const draft = draftFromFieldpiece("Refrigerant R32\nEvaporator Saturation 0 °C\n", blankChargeReading());
    expect(Number(draft.reading.suctionPressure)).toBeCloseTo(7.12, 1);
    expect(draft.notes.some((note) => note.includes("njehsua"))).toBe(true);
  });
});
