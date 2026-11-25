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
        <h2>Llogaritësi BTU</h2>
        <p className="hint">Udhëzues vere për Shkodrën: izolimi, dielli, personat dhe kati. Sugjeron 9k, 12k, 18k ose 24k. Nuk është një studim i plotë i humbjes së nxehtësisë.</p>
      </section>
      <section className="card stack">
        <div className="row">
          <Field label="Sipërfaqja, m²">
            <input inputMode="decimal" value={input.area} onChange={(event) => set({ area: event.target.value })} />
          </Field>
          <Field label="Gjatësia, m">
            <input inputMode="decimal" value={input.length} onChange={(event) => set({ length: event.target.value })} />
          </Field>
          <Field label="Gjerësia, m">
            <input inputMode="decimal" value={input.width} onChange={(event) => set({ width: event.target.value })} />
          </Field>
        </div>
        <Field label="Lartësia, m">
          <input inputMode="decimal" value={input.height} onChange={(event) => set({ height: event.target.value })} />
        </Field>
        <Field label="Izolimi">
          <select value={input.insulation} onChange={(event) => set({ insulation: event.target.value as BtuInput["insulation"] })}>
            <option value="good">Mirë</option>
            <option value="average">Mesatar</option>
            <option value="poor">Dobët</option>
          </select>
        </Field>
        <Field label="Persona në dhomë">
          <input inputMode="numeric" value={input.people} onChange={(event) => set({ people: event.target.value })} />
        </Field>
        <label className="check-row">
          <input type="checkbox" checked={input.kitchen} onChange={(event) => set({ kitchen: event.target.checked })} />
          <span>Kuzhinë ose aparate me nxehtësi</span>
        </label>
        <Field label="Kati">
          <select value={input.floor} onChange={(event) => set({ floor: event.target.value as BtuInput["floor"] })}>
            <option value="middle">Kat i mesëm</option>
            <option value="ground">Përdhe</option>
            <option value="top">Kati i fundit</option>
          </select>
        </Field>
        <h3>Dritaret</h3>
        {input.windows.map((window, index) => (
          <div key={index} className="line">
            <div className="row">
              <Field label="Gjerësia, m">
                <input inputMode="decimal" value={window.width} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, width: event.target.value };
                  set({ windows });
                }} />
              </Field>
              <Field label="Lartësia, m">
                <input inputMode="decimal" value={window.height} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, height: event.target.value };
                  set({ windows });
                }} />
              </Field>
              <Field label="Dielli">
                <select value={window.orientation} onChange={(event) => {
                  const windows = input.windows.slice();
                  windows[index] = { ...window, orientation: event.target.value as Orientation };
                  set({ windows });
                }}>
                  <option value="N">Veri</option>
                  <option value="E">Lindje</option>
                  <option value="S">Jug</option>
                  <option value="W">Perëndim</option>
                </select>
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => set({ windows: [...input.windows, { width: "", height: "", orientation: "S" }] })}>
          Shto dritare
        </button>
      </section>
      <section className="card">
        <p className="hint">Dhoma {roomArea(input).toFixed(1)} m² · rreth {Math.round(result.watts)} W · {Math.round(result.btu).toLocaleString("en-US")} BTU/h</p>
        <div className="hero pos">
          <div className="kicker">Sugjerimi</div>
          <span className="money pos lg">{result.size}</span>
        </div>
        {result.over ? <p className="warn">Mbi 24k. Një njësi mund të mos mjaftojë.</p> : null}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn gold" onClick={() => onUse(result.size, "offer")}>Përdor në ofertë</button>
          <button type="button" className="btn" onClick={() => onUse(result.size, "install")}>Përdor në montim</button>
        </div>
        {result.size === "9k" ? <p className="hint">9k është madhësia. Çmimin e blerjes dhe të shitjes i shkruan te puna.</p> : null}
      </section>
    </div>
  );
}
