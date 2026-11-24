import { useState } from "react";
import { blankChargeReading, evaluateReading } from "../lib/charge";
import { readFieldpieceFile } from "../lib/fieldpieceRead";
import { whatsappHref } from "../lib/offer";
import type { ChargeReading, ChargeRefrigerant, ServiceJob } from "../lib/types";
import { Field } from "../ui";

const TONE: Record<string, string> = { ok: "ok", warn: "warn", bad: "bad", none: "" };

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ChargeCheck({ job, onChange }: { job: ServiceJob; onChange: (job: ServiceJob) => void }) {
  const [draft, setDraft] = useState<ChargeReading>(() => blankChargeReading());
  const [review, setReview] = useState<ChargeReading | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const active = review ?? draft;
  const result = evaluateReading(active);
  const readings = job.chargeReadings ?? [];

  function patch(partial: Partial<ChargeReading>, target: "draft" | "review" = "draft") {
    if (target === "review" && review) setReview({ ...review, ...partial });
    else setDraft((current) => ({ ...current, ...partial }));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf") ? "Po lexoj PDF…" : "Po lexoj foton…");
    try {
      const imported = await readFieldpieceFile(file, draft);
      setReview(imported.reading);
      setNotes(imported.notes);
    } catch {
      setError("Nuk e lexova dot atë skedar. Provo një PDF të Job Link ose një foto më të qartë.");
    } finally {
      setBusy("");
    }
  }

  function addReading(source: ChargeReading) {
    const next = { ...source, id: crypto.randomUUID(), at: new Date().toISOString(), pressureUnit: "bar" as const };
    onChange({ ...job, chargeReadings: [next, ...(job.chargeReadings ?? [])] });
    setDraft(next);
    setReview(null);
  }

  async function copyCustomer() {
    try {
      await navigator.clipboard.writeText(result.customerText);
      setCopied("Teksti u kopjua.");
    } catch {
      setCopied(result.customerText);
    }
  }

  return (
    <section className="card stack" data-testid="charge-section">
      <h2>Kontroll Sistemi / Ngarkesa</h2>
      <p className="hint">Udhëzim nga matjet në vend. Të dhënat e prodhuesit dhe targëza e ngarkesës kanë përparësi. Temperaturat janë vetëm në °C.</p>
      <p className="hint">{result.targets}</p>
      {draft.metering === "exv" ? <p className="hint">Për inverter: matjet në test / forced mode, shpejtësi e plotë, pas të paktën 15 minutash pune.</p> : null}

      <label className="btn">
        Importo raport Fieldpiece
        <input
          data-testid="fieldpiece-file"
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
      </label>
      {busy ? <p className="hint">{busy}</p> : null}
      {error ? <p className="warn">{error}</p> : null}

      {review ? (
        <div className="stack" data-testid="fieldpiece-review">
          <h3>Kontrollo vlerat para se t’i ruash</h3>
          <p className="hint">Çdo fushë mund të ndryshohet. Fushat bosh nuk u njohën në raport.</p>
          <ReadingFields reading={review} onChange={(partial) => patch(partial, "review")} />
          {notes.length ? (
            <div className="callout">
              {notes.map((note) => <p key={note}>{note}</p>)}
            </div>
          ) : null}
          <button type="button" className="btn gold" onClick={() => { setDraft(review); setReview(null); }}>Vendos në formular</button>
          <button type="button" className="btn" onClick={() => setReview(null)}>Anulo</button>
        </div>
      ) : (
        <ReadingFields reading={draft} onChange={(partial) => patch(partial)} />
      )}

      <div className="stack" data-testid="charge-result">
        {result.values.map((item) => (
          <div key={item.key} className="kv">
            <span>{item.label}<small className="hint"> {item.target}</small></span>
            <b className={`pill ${TONE[item.tone]}`}>{item.value == null ? "—" : `${item.value.toFixed(1)} ${item.unit}`}</b>
          </div>
        ))}
        <h3>Për teknikun</h3>
        <pre className="report-text">{result.techSummary}</pre>
        <h3>Shpjegim për klientin</h3>
        <p data-testid="charge-customer">{result.customerText}</p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => void copyCustomer()}>Copy</button>
          <a className="btn" href={whatsappHref(result.customerText, job.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
          <button type="button" className="btn gold" onClick={() => addReading(active)}>Shto matjen</button>
        </div>
        {copied ? <p className="hint">{copied}</p> : null}
      </div>

      <h3>Matjet e ruajtura</h3>
      {readings.length === 0 ? <p className="hint">Ende pa matje të ruajtura.</p> : null}
      {readings.map((item) => {
        const saved = evaluateReading(item);
        return (
          <div key={item.id} className="line">
            <strong>{formatWhen(item.at)} · {item.refrigerant}</strong>
            <p className="hint">{saved.findings.map((finding) => finding.sq).join(" ")}</p>
            <button type="button" className="btn danger" onClick={() => onChange({ ...job, chargeReadings: readings.filter((row) => row.id !== item.id) })}>Fshi</button>
          </div>
        );
      })}
    </section>
  );
}

function ReadingFields({ reading, onChange }: { reading: ChargeReading; onChange: (partial: Partial<ChargeReading>) => void }) {
  const set = (key: keyof ChargeReading, value: string) => onChange({ [key]: value });
  return (
    <div className="stack">
      <Field label="Gazi">
        <select value={reading.refrigerant} onChange={(event) => onChange({ refrigerant: event.target.value as ChargeRefrigerant })}>
          <option value="R32">R32</option>
          <option value="R410A">R410A</option>
          <option value="R22">R22</option>
        </select>
      </Field>
      <Field label="Mënyra">
        <select value={reading.mode} onChange={(event) => onChange({ mode: event.target.value as ChargeReading["mode"] })}>
          <option value="cooling">Ftohje</option>
          <option value="heating">Ngrohje</option>
        </select>
      </Field>
      <Field label="Dozimi">
        <select value={reading.metering} onChange={(event) => onChange({ metering: event.target.value as ChargeReading["metering"] })}>
          <option value="exv">EXV / inverter</option>
          <option value="capillary">Kapilar</option>
          <option value="txv">TXV</option>
        </select>
      </Field>
      <Field label="Njësia e presionit">
        <select value={reading.pressureUnit} onChange={(event) => onChange({ pressureUnit: event.target.value as ChargeReading["pressureUnit"] })}>
          <option value="bar">bar</option>
          <option value="psi">psi</option>
        </select>
      </Field>
      <div className="row">
        <Field label={`Thithja / ana e ulët (${reading.pressureUnit})`}>
          <input data-testid="suction-pressure" inputMode="decimal" value={reading.suctionPressure} onChange={(event) => set("suctionPressure", event.target.value)} />
        </Field>
        <Field label={`Lëngu / ana e lartë (${reading.pressureUnit})`}>
          <input data-testid="liquid-pressure" inputMode="decimal" value={reading.liquidPressure} onChange={(event) => set("liquidPressure", event.target.value)} />
        </Field>
      </div>
      <div className="row">
        <Field label="Tubi i thithjes °C">
          <input inputMode="decimal" value={reading.suctionTemp} onChange={(event) => set("suctionTemp", event.target.value)} />
        </Field>
        <Field label="Tubi i lëngut °C">
          <input inputMode="decimal" value={reading.liquidTemp} onChange={(event) => set("liquidTemp", event.target.value)} />
        </Field>
      </div>
      <div className="row">
        <Field label="Ajri i kthimit °C">
          <input inputMode="decimal" value={reading.returnAir} onChange={(event) => set("returnAir", event.target.value)} />
        </Field>
        <Field label="Ajri i furnizimit °C">
          <input inputMode="decimal" value={reading.supplyAir} onChange={(event) => set("supplyAir", event.target.value)} />
        </Field>
      </div>
      <div className="row">
        <Field label="Ambienti jashtë °C">
          <input inputMode="decimal" value={reading.outdoorAmbient} onChange={(event) => set("outdoorAmbient", event.target.value)} />
        </Field>
        <Field label="Wet bulb i brendshëm °C, opsional">
          <input inputMode="decimal" value={reading.wetBulb} onChange={(event) => set("wetBulb", event.target.value)} />
        </Field>
      </div>
      <div className="row">
        <Field label="Amperë të matur, opsional">
          <input inputMode="decimal" value={reading.compressorAmps} onChange={(event) => set("compressorAmps", event.target.value)} />
        </Field>
        <Field label="Amperë të targëzës, opsional">
          <input inputMode="decimal" value={reading.ratedAmps} onChange={(event) => set("ratedAmps", event.target.value)} />
        </Field>
      </div>
      <Field label="Gjatësia e linjës, m, opsionale">
        <input inputMode="decimal" value={reading.lineSetM} onChange={(event) => set("lineSetM", event.target.value)} />
      </Field>
    </div>
  );
}
