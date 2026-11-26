import { useState } from "react";
import { lek } from "../lib/format";
import {
  INDOOR_SIZES,
  LINE_PIPES,
  OUTDOOR_SIZES,
  addIndoor,
  addOutdoor,
  addSystem,
  applyIndoorSize,
  copyIndoor,
  headSummary,
  missingPipePrices,
  patchIndoor,
  patchMount,
  removeIndoor,
  removeOutdoor,
  removeSystem,
  sameLength,
  setAllLengths,
  setKind,
  setLiquidLength,
  setPipe,
  systemRollup,
  withMount,
} from "../lib/split";
import type { IndoorUnit, OutdoorUnit, Pipe, Settings, SplitSystem } from "../lib/types";

function Stepper({ value, unit, onChange, testId }: { value: string; unit: string; onChange: (next: string) => void; testId: string }) {
  const current = Math.max(0, Math.round(Number(value) || 0));
  return (
    <div className="stepper-line">
      <button type="button" data-testid={`${testId}-minus`} onClick={() => onChange(String(Math.max(0, current - 1)))}>−</button>
      <input
        className="step-num"
        data-testid={`${testId}-value`}
        inputMode="decimal"
        value={value}
        aria-label={unit}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
      />
      <button type="button" data-testid={`${testId}-plus`} onClick={() => onChange(String(current + 1))}>+</button>
    </div>
  );
}

function Chips({ options, value, onPick, testPrefix }: { options: readonly string[]; value: string; onPick: (value: string) => void; testPrefix: string }) {
  return (
    <div className="size-chips">
      {options.map((option) => (
        <button key={option} type="button" data-testid={`${testPrefix}-${option}`} className={`chip${value === option ? " on" : ""}`} onClick={() => onPick(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

export function SplitPanel({
  systems,
  settings,
  onChange,
}: {
  systems: SplitSystem[];
  settings: Settings;
  onChange: (systems: SplitSystem[]) => void;
}) {
  const total = systemRollup(systems).sell;
  return (
    <section className="card stack" data-testid="split-details">
      <h2>Detaje</h2>
      <p className="detail-total" data-testid="split-total">Detajet {lek(total)}</p>
      {systems.map((system, s) => (
        <div key={system.id} className="split-block">
          {systems.length > 1 ? (
            <div className="spread">
              <strong>Sistemi {s + 1}</strong>
              <button type="button" className="btn" onClick={() => onChange(removeSystem(systems, s))}>Hiq</button>
            </div>
          ) : null}
          <div className="size-chips">
            <button type="button" data-testid={`kind-single-${s}`} className={`chip${system.kind === "single" ? " on" : ""}`} onClick={() => onChange(systems.map((item, si) => si === s ? setKind(item, "single", settings) : item))}>Single split</button>
            <button type="button" data-testid={`kind-multi-${s}`} className={`chip${system.kind === "multi" ? " on" : ""}`} onClick={() => onChange(systems.map((item, si) => si === s ? setKind(item, "multi", settings) : item))}>Multi split</button>
          </div>
          {system.outdoors.map((outdoor, o) => (
            <OutdoorBlock
              key={outdoor.id}
              outdoor={outdoor}
              settings={settings}
              multi={system.kind === "multi"}
              canRemove={system.outdoors.length > 1}
              testPrefix={`${s}-${o}`}
              onOutdoor={(patch) => onChange(patchMount(systems, s, o, patch))}
              onHead={(i, next) => onChange(patchIndoor(systems, s, o, i, () => next))}
              onCopy={(i) => onChange(copyIndoor(systems, s, o, i))}
              onRemoveHead={(i) => onChange(removeIndoor(systems, s, o, i))}
              onAddHead={() => onChange(addIndoor(systems, s, o, settings))}
              onRemove={() => onChange(removeOutdoor(systems, s, o))}
            />
          ))}
          {system.kind === "multi" ? (
            <button type="button" className="btn" data-testid={`add-outdoor-${s}`} onClick={() => onChange(addOutdoor(systems, s, settings))}>Shto njësi të jashtme</button>
          ) : null}
        </div>
      ))}
      <button type="button" className="btn" data-testid="add-system" onClick={() => onChange(addSystem(systems, settings))}>Shto sistem</button>
    </section>
  );
}

function OutdoorBlock({
  outdoor,
  settings,
  multi,
  canRemove,
  testPrefix,
  onOutdoor,
  onHead,
  onCopy,
  onRemoveHead,
  onAddHead,
  onRemove,
}: {
  outdoor: OutdoorUnit;
  settings: Settings;
  multi: boolean;
  canRemove: boolean;
  testPrefix: string;
  onOutdoor: (patch: Partial<OutdoorUnit>) => void;
  onHead: (index: number, unit: IndoorUnit) => void;
  onCopy: (index: number) => void;
  onRemoveHead: (index: number) => void;
  onAddHead: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="stack">
      {multi ? (
        <>
          <span>Njësia e jashtme</span>
          <Chips options={OUTDOOR_SIZES} value={outdoor.size} testPrefix={`out-size-${testPrefix}`} onPick={(size) => onOutdoor({ size })} />
        </>
      ) : null}
      <div className="size-chips">
        <button type="button" data-testid={`mount-wall-${testPrefix}`} className={`chip${outdoor.mount === "wall" ? " on" : ""}`} onClick={() => onOutdoor(withMount(outdoor, "wall", settings))}>Mbajtëse muri</button>
        <button type="button" data-testid={`mount-ground-${testPrefix}`} className={`chip${outdoor.mount === "ground" ? " on" : ""}`} onClick={() => onOutdoor(withMount(outdoor, "ground", settings))}>Basament toke</button>
      </div>
      <div className="spread">
        <span>Sasia</span>
        <Stepper value={outdoor.mountQty} unit="" testId={`mount-qty-${testPrefix}`} onChange={(mountQty) => onOutdoor({ mountQty })} />
      </div>
      <label className="field">
        <span>Çmimi i mbajtjes, Lek</span>
        <input data-testid={`mount-price-${testPrefix}`} inputMode="decimal" value={outdoor.mountPrice} onChange={(event) => onOutdoor({ mountPrice: event.target.value })} />
      </label>
      {outdoor.indoors.map((unit, index) => (
        <HeadCard
          key={unit.id}
          unit={unit}
          settings={settings}
          multi={multi}
          canRemove={outdoor.indoors.length > 1}
          testId={multi ? `${testPrefix}-${index}` : "single"}
          onChange={(next) => onHead(index, next)}
          onCopy={() => onCopy(index)}
          onRemove={() => onRemoveHead(index)}
        />
      ))}
      {multi ? <button type="button" className="btn" data-testid={`add-indoor-${testPrefix}`} onClick={onAddHead}>Shto njësi</button> : null}
      {multi && canRemove ? <button type="button" className="btn" onClick={onRemove}>Hiq njësinë e jashtme</button> : null}
    </div>
  );
}

function HeadCard({
  unit,
  settings,
  multi,
  canRemove,
  testId,
  onChange,
  onCopy,
  onRemove,
}: {
  unit: IndoorUnit;
  settings: Settings;
  multi: boolean;
  canRemove: boolean;
  testId: string;
  onChange: (unit: IndoorUnit) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const [pipesOpen, setPipesOpen] = useState(false);
  const [split, setSplit] = useState(!sameLength(unit));
  const gaps = missingPipePrices(unit);
  return (
    <div className="stack head-card">
      <div className="head-row">
        <div className="head-sum" data-testid={testId === "single" ? "single-summary" : `head-${testId}`}>{headSummary(unit)}</div>
        {multi ? <button type="button" className="btn" data-testid={`copy-${testId}`} onClick={onCopy}>Kopjo</button> : null}
        {multi && canRemove ? <button type="button" className="btn" onClick={onRemove}>Hiq</button> : null}
      </div>
      {gaps.length ? <p className="warn" data-testid={`price-warn-${testId}`}>Duhet çmimi për {gaps.join(", ")}</p> : null}
      {multi ? <Chips options={INDOOR_SIZES} value={unit.size} testPrefix={`head-size-${testId}`} onPick={(size) => onChange(applyIndoorSize(unit, size, settings))} /> : null}
      <label className="check-row">
        <input
          data-testid={`same-${testId}`}
          type="checkbox"
          checked={!split}
          onChange={() => {
            if (split) {
              setSplit(false);
              onChange(setAllLengths(unit, unit.liquidM || unit.runM || "3"));
            } else setSplit(true);
          }}
        />
        <span>Të gjitha njësoj</span>
      </label>
      {!split ? (
        <div className="spread">
          <span>Metra</span>
          <Stepper value={unit.liquidM} unit="m" testId={testId === "single" ? "run" : `run-${testId}`} onChange={(meters) => onChange(setAllLengths(unit, meters))} />
        </div>
      ) : (
        <div className="stack">
          <Meter label="Lëngu" value={unit.liquidM} testId={`liquid-m-${testId}`} onChange={(liquidM) => onChange(setLiquidLength(unit, liquidM))} />
          <Meter label="Avulli" value={unit.vaporM} testId={`vapor-m-${testId}`} onChange={(vaporM) => onChange({ ...unit, vaporM })} />
          <Meter label="Kabllo 3×2.5" value={unit.cable3M} testId={`cable3-m-${testId}`} onChange={(cable3M) => onChange({ ...unit, cable3M })} />
          <Meter label="Kabllo 5×1.5" value={unit.cable5M} testId={`cable5-m-${testId}`} onChange={(cable5M) => onChange({ ...unit, cable5M })} />
          <Meter label="Drenazh" value={unit.drainM} testId={`drain-m-${testId}`} onChange={(drainM) => onChange({ ...unit, drainM })} />
        </div>
      )}
      {multi ? null : <button type="button" className="btn" data-testid={`pipes-${testId}`} onClick={() => setPipesOpen((open) => !open)}>{pipesOpen ? "Mbyll tubat" : "Tubat"}</button>}
      {multi || pipesOpen ? (
        <div className="stack">
          <span>Tub i lëngshëm</span>
          <Chips options={LINE_PIPES} value={unit.liquid} testPrefix={`pipe-liquid-${testId}`} onPick={(pipe) => onChange(setPipe(unit, "liquid", pipe as Pipe, settings))} />
          <span>Tub i avullit</span>
          <Chips options={LINE_PIPES} value={unit.vapor} testPrefix={`pipe-vapor-${testId}`} onPick={(pipe) => onChange(setPipe(unit, "vapor", pipe as Pipe, settings))} />
        </div>
      ) : null}
    </div>
  );
}

function Meter({ label, value, testId, onChange }: { label: string; value: string; testId: string; onChange: (value: string) => void }) {
  return (
    <div className="spread">
      <span>{label}</span>
      <Stepper value={value} unit="m" testId={testId} onChange={onChange} />
    </div>
  );
}
