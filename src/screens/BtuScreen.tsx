import { useState } from "react";
import { estimateLoad, roomArea, type BtuInput, type Orientation, type RecommendSize } from "../lib/btu";
import { Field } from "../ui";

const empty = (): BtuInput => ({
  area: "",
  length: "",
  width: "",
  height: "2.6",
  windows: [{ width: "", height: "", orientation: "S" }],
  insulation: "average",
  people: "2",
  kitchen: false,
  floor: "middle",
});

export function BtuScreen({ onUse }: { onUse: (size: RecommendSize, target: "offer" | "install") => void }) {
  const [input, setInput] = useState<BtuInput>(empty);
  const result = estimateLoad(input);
  const set = (patch: Partial<BtuInput>) => setInput({ ...input, ...patch });

  return (
    <div className="stack">
      <section className="card">
        <h2>BTU calculator (kalkulatori BTU)</h2>
        <p className="hint">A Shkodër summer guide: insulation, sun, people and floor. It recommends 9k, 12k, 18k or 24k. It is not a full heat-loss survey.</p>
      </section>
      <section className="card stack">
        <div className="row">
          <Field label="Floor area, m² (sipërfaqja)">
            <input inputMode="decimal" value={input.area} onChange={(event) => set({ area: event.target.value })} />
          </Field>
          <Field label="Or length, m (gjatësia)">
            <input inputMode="decimal" value={input.length} onChange={(event) => set({ length: event.target.value })} />
          </Field>
          <Field label="Width, m (gjerësia)">
            <input inputMode="decimal" value={input.width} onChange={(event) => set({ width: event.target.value })} />
          </Field>
        </div>
        <Field label="Ceiling height, m (lartësia)">
          <input inputMode="decimal" value={input.height} onChange={(event) => set({ height: event.target.value })} />
        </Field>
        <Field label="Insulation (izolimi)">
          <select value={input.insulation} onChange={(event) => set({ insulation: event.target.value as BtuInput["insulation"] })}>
            <option value="good">Good (mirë)</option>
            <option value="average">Average (mesatar)</option>
            <option value="poor">Poor (dobët)</option>
          </select>
        </Field>
        <Field label="People in the room (persona)">
          <input inputMode="numeric" value={input.people} onChange={(event) => set({ people: event.target.value })} />
        </Field>
        <label className="check-row">
          <input type="checkbox" checked={input.kitchen} onChange={(event) => set({ kitchen: event.target.checked })} />
          <span>Kitchen or heat appliances (kuzhinë / aparate)</span>
        </label>
        <Field label="Floor (kati)">
          <select value={input.floor} onChange={(event) => set({ floor: event.target.value as BtuInput["floor"] })}>
            <option value="middle">Middle floor (kat i mesëm)</option>
            <option value="ground">Ground floor (përdhe)</option>
            <option value="top">Top floor (kati i fundit)</option>
          </select>
        </Field>
        <h3>Windows (dritaret)</h3>
        {input.windows.map((window, index) => (
          <div key={index} className="line">
            <div className="row">
              <Field label="Width, m">
                <input inputMode="decimal" value={window.width} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, width: event.target.value };
                  set({ windows });
                }} />
              </Field>
              <Field label="Height, m">
                <input inputMode="decimal" value={window.height} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, height: event.target.value };
                  set({ windows });
                }} />
              </Field>
              <Field label="Sun (dielli)">
                <select value={window.orientation} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, orientation: event.target.value as Orientation };
                  set({ windows });
                }}>
                  <option value="N">North (veri)</option>
                  <option value="E">East (lindje)</option>
                  <option value="S">South (jug)</option>
                  <option value="W">West (perëndim)</option>
                </select>
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => set({ windows: [...input.windows, { width: "", height: "", orientation: "S" }] })}>
          Add window (shto dritare)
        </button>
      </section>
      <section className="card">
        <p className="hint">Room {roomArea(input).toFixed(1)} m² · about {Math.round(result.watts)} W · {Math.round(result.btu).toLocaleString("en-US")} BTU/h</p>
        <div className="hero pos">
          <div className="kicker">Recommended (rekomandimi)</div>
          <span className="money pos lg">{result.size}</span>
        </div>
        {result.over ? <p className="warn">Above 24k. One unit may not be enough. (Mbi 24k. Një njësi mund të mos mjaftojë.)</p> : null}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn gold" onClick={() => onUse(result.size, "offer")}>Use in an offer (përdor në ofertë)</button>
          <button type="button" className="btn" onClick={() => onUse(result.size, "install")}>Use in an installation (përdor në montim)</button>
        </div>
        {result.size === "9k" ? <p className="hint">9k is the size guide. Enter the buy price and the selling price on the job.</p> : null}
      </section>
    </div>
  );
}
