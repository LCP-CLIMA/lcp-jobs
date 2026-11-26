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
  patchIndoor,
  patchMount,
  removeIndoor,
  removeOutdoor,
  removeSystem,
  setKind,
  setPipe,
  setRun,
  systemRollup,
} from "../lib/split";
import type { IndoorUnit, OutdoorUnit, Pipe, Settings, SplitSystem } from "../lib/types";

function Stepper({ value, unit, onChange, testId }: { value: string; unit: string; onChange: (next: string) => void; testId: string }) {
  const current = Math.max(0, Math.round(Number(value) || 0));
  return (
    <div className="stepper-line">
      <button type="button" data-testid={`${testId}-minus`} onClick={() => onChange(String(Math.max(0, current - 1)))}>−</button>
      <b>{current} {unit}</b>
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
  const [edit, setEdit] = useState<{ s: number; o: number; i: number } | null>(null);
  const total = systemRollup(systems).sell;
  const head = edit ? systems[edit.s]?.outdoors[edit.o]?.indoors[edit.i] : undefined;

  if (edit && head) {
    return (
      <section className="card stack" data-testid="split-details">
        <button type="button" className="btn" data-testid="head-done" onClick={() => setEdit(null)}>Gati</button>
        <HeadEditor
          unit={head}
          settings={settings}
          onChange={(next) => onChange(patchIndoor(systems, edit.s, edit.o, edit.i, () => next))}
          onDone={() => setEdit(null)}
        />
        <p className="detail-total" data-testid="split-total">Detajet {lek(total)}</p>
      </section>
    );
  }

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
              multi={system.kind === "multi"}
              canRemove={system.outdoors.length > 1}
              testPrefix={`${s}-${o}`}
              onOutdoor={(patch) => onChange(patchMount(systems, s, o, patch))}
              onOpen={(i) => setEdit({ s, o, i })}
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
  multi,
  canRemove,
  testPrefix,
  onOutdoor,
  onOpen,
  onCopy,
  onRemoveHead,
  onAddHead,
  onRemove,
}: {
  outdoor: OutdoorUnit;
  multi: boolean;
  canRemove: boolean;
  testPrefix: string;
  onOutdoor: (patch: Partial<OutdoorUnit>) => void;
  onOpen: (index: number) => void;
  onCopy: (index: number) => void;
  onRemoveHead: (index: number) => void;
  onAddHead: () => void;
  onRemove: () => void;
}) {
  const only = outdoor.indoors[0];
  return (
    <div className="stack">
      {multi ? (
        <>
          <span>Njësia e jashtme</span>
          <Chips options={OUTDOOR_SIZES} value={outdoor.size} testPrefix={`out-size-${testPrefix}`} onPick={(size) => onOutdoor({ size })} />
        </>
      ) : null}
      <div className="size-chips">
        <button type="button" data-testid={`mount-wall-${testPrefix}`} className={`chip${outdoor.mount === "wall" ? " on" : ""}`} onClick={() => onOutdoor({ mount: "wall" })}>Mbajtëse muri</button>
        <button type="button" data-testid={`mount-ground-${testPrefix}`} className={`chip${outdoor.mount === "ground" ? " on" : ""}`} onClick={() => onOutdoor({ mount: "ground" })}>Basament toke</button>
      </div>
      <div className="spread">
        <span>Sasia</span>
        <Stepper value={outdoor.mountQty} unit="" testId={`mount-qty-${testPrefix}`} onChange={(mountQty) => onOutdoor({ mountQty })} />
      </div>
      <label className="field">
        <span>Çmimi i mbajtjes, Lek</span>
        <input data-testid={`mount-price-${testPrefix}`} inputMode="decimal" value={outdoor.mountPrice} placeholder="0" onChange={(event) => onOutdoor({ mountPrice: event.target.value })} />
      </label>
      {multi ? (
        <>
          {outdoor.indoors.map((unit, index) => (
            <div key={unit.id} className="head-row">
              <button type="button" className="head-sum" data-testid={`head-${testPrefix}-${index}`} onClick={() => onOpen(index)}>{headSummary(unit)}</button>
              <button type="button" className="btn" data-testid={`copy-${testPrefix}-${index}`} onClick={() => onCopy(index)}>Kopjo</button>
              {outdoor.indoors.length > 1 ? <button type="button" className="btn" onClick={() => onRemoveHead(index)}>Hiq</button> : null}
            </div>
          ))}
          <button type="button" className="btn" data-testid={`add-indoor-${testPrefix}`} onClick={onAddHead}>Shto njësi</button>
          {canRemove ? <button type="button" className="btn" onClick={onRemove}>Hiq njësinë e jashtme</button> : null}
        </>
      ) : only ? (
        <SingleHead unit={only} onOpen={() => onOpen(0)} onChange={(next) => onOutdoor({ indoors: [next], size: next.size })} />
      ) : null}
    </div>
  );
}

function SingleHead({ unit, onOpen, onChange }: { unit: IndoorUnit; onOpen: () => void; onChange: (unit: IndoorUnit) => void }) {
  return (
    <div className="stack">
      <button type="button" className="head-sum" data-testid="single-summary" onClick={onOpen}>{headSummary(unit)}</button>
      <div className="spread">
        <span>Metra</span>
        <Stepper value={unit.runM} unit="m" testId="run" onChange={(meters) => onChange(setRun(unit, meters))} />
      </div>
      <p className="hint">Tubat, kabllot dhe drenazhi ndjekin metrat. Shtyp rreshtin për t’i ndryshuar.</p>
    </div>
  );
}

function HeadEditor({ unit, settings, onChange, onDone }: { unit: IndoorUnit; settings: Settings; onChange: (unit: IndoorUnit) => void; onDone: () => void }) {
  const [separate, setSeparate] = useState(
    unit.liquidM !== unit.runM || unit.vaporM !== unit.runM || unit.cable3M !== unit.runM || unit.cable5M !== unit.runM || unit.drainM !== unit.runM,
  );
  return (
    <div className="stack" data-testid="head-editor">
      <h2>Koka {unit.size}</h2>
      <Chips options={INDOOR_SIZES} value={unit.size} testPrefix="head-size" onPick={(size) => onChange(applyIndoorSize(unit, size, settings))} />
      <span>Tub i lëngshëm</span>
      <Chips options={LINE_PIPES} value={unit.liquid} testPrefix="pipe-liquid" onPick={(pipe) => onChange(setPipe(unit, "liquid", pipe as Pipe, settings))} />
      <span>Tub i avullit</span>
      <Chips options={LINE_PIPES} value={unit.vapor} testPrefix="pipe-vapor" onPick={(pipe) => onChange(setPipe(unit, "vapor", pipe as Pipe, settings))} />
      <div className="spread">
        <span>Metra</span>
        <Stepper value={unit.runM} unit="m" testId="run" onChange={(meters) => onChange(setRun(unit, meters))} />
      </div>
      <button type="button" className={`chip${separate ? " on" : ""}`} data-testid="separate-meters" onClick={() => setSeparate((value) => !value)}>
        Metra veç e veç
      </button>
      {separate ? (
        <div className="stack">
          <FieldMeter label="Lëngu" value={unit.liquidM} testId="liquid-m" onChange={(liquidM) => onChange({ ...unit, liquidM })} />
          <FieldMeter label="Avulli" value={unit.vaporM} testId="vapor-m" onChange={(vaporM) => onChange({ ...unit, vaporM })} />
          <FieldMeter label="Kabllo 3×2.5" value={unit.cable3M} testId="cable3-m" onChange={(cable3M) => onChange({ ...unit, cable3M })} />
          <FieldMeter label="Kabllo 5×1.5" value={unit.cable5M} testId="cable5-m" onChange={(cable5M) => onChange({ ...unit, cable5M })} />
          <FieldMeter label="Drenazh" value={unit.drainM} testId="drain-m" onChange={(drainM) => onChange({ ...unit, drainM })} />
        </div>
      ) : <p className="hint">Të gjitha linjat janë {unit.runM || "0"} m. Çmimet vijnë nga lista.</p>}
      <button type="button" className="btn gold" data-testid="head-done-bottom" onClick={onDone}>Gati</button>
    </div>
  );
}

function FieldMeter({ label, value, testId, onChange }: { label: string; value: string; testId: string; onChange: (value: string) => void }) {
  return (
    <div className="spread">
      <span>{label}</span>
      <Stepper value={value} unit="m" testId={testId} onChange={onChange} />
    </div>
  );
}
