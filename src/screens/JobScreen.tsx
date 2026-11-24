import { useEffect, useRef, useState } from "react";
import { isService } from "../lib/defaults";
import { saveJob } from "../lib/db";
import { formatDate, mapsUrl } from "../lib/format";
import { compute } from "../lib/calc";
import { serviceCompute } from "../lib/service";
import { isFinished, SERVICE_STATUSES } from "../lib/status";
import type { InstallJob, JobRecord, JobStatus, ServiceJob } from "../lib/types";
import { Field, ProfitHero, Toggle } from "../ui";
import { Calculator } from "./Calculator";
import { Photos } from "./Photos";
import { PrintView } from "./PrintView";
import { ServiceForm } from "./ServiceForm";

export function JobScreen({
  initial,
  tab,
  phone,
  onTab,
  onSaved,
  onDirty,
  onFinished,
  onPrint,
  onDuplicate,
  onDelete,
}: {
  initial: JobRecord;
  tab: "job" | "costs" | "quote" | "photos";
  phone: string;
  onTab: (tab: "job" | "costs" | "quote" | "photos") => void;
  onSaved: (job: JobRecord) => void;
  onDirty: (dirty: boolean) => void;
  onFinished: () => void;
  onPrint: (mode: "quote" | "internal") => void;
  onDuplicate: (job: JobRecord) => void;
  onDelete: () => void;
}) {
  const [job, setJob] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const snap = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(job) !== snap.current;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function persist(next: JobRecord) {
    const savedJob = { ...next, updatedAt: new Date().toISOString() } as JobRecord;
    await saveJob(savedJob);
    snap.current = JSON.stringify(savedJob);
    setJob(savedJob);
    onSaved(savedJob);
    onDirty(false);
    return savedJob;
  }

  const service = isService(job);
  const ticking = service && job.timerStartedAt != null;
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);
  const patch = (partial: Partial<JobRecord>) => setJob({ ...job, ...partial, updatedAt: new Date().toISOString() } as JobRecord);

  return (
    <div className="stack">
      <div className="tabs">
        <button type="button" className={`chip${tab === "job" ? " on" : ""}`} onClick={() => onTab("job")}>
          {service ? "Call (vizita)" : "Job (puna)"}
        </button>
        {service ? null : (
          <button type="button" className={`chip${tab === "costs" ? " on" : ""}`} onClick={() => onTab("costs")}>
            Costs (kostoja)
          </button>
        )}
        <button type="button" className={`chip${tab === "quote" ? " on" : ""}`} onClick={() => onTab("quote")}>
          Quote (oferta)
        </button>
        <button type="button" className={`chip${tab === "photos" ? " on" : ""}`} onClick={() => onTab("photos")}>
          Photos (fotot)
        </button>
      </div>
      <button type="button" className={`btn full${dirty ? " gold" : ""}`} onClick={() => void persist(job)}>
        {dirty ? "Save (ruaj)" : "Saved (e ruajtur)"}
      </button>

      {tab === "quote" ? (
        <div className="stack">
          <Toggle
            label="Show TVSH on the offer (shfaq TVSH në ofertë)"
            checked={job.showVatOnQuote === true}
            onChange={(showVatOnQuote) => patch({ showVatOnQuote })}
          />
          <p className="hint">
            {job.showVatOnQuote === true
              ? "The offer shows subtotal, TVSH and the total. (Oferta tregon nëntotalin, TVSH dhe totalin.)"
              : "The offer shows the price without TVSH. (Oferta tregon çmimin pa TVSH.)"}
          </p>
          <PrintView job={job} mode="quote" phone={phone} />
          <button type="button" className="btn gold" onClick={() => { void persist(job).then(() => onPrint("quote")); }}>
            Print offer (printo ofertën)
          </button>
        </div>
      ) : null}

      {tab === "photos" ? <Photos jobId={job.id} /> : null}

      {tab === "costs" && !service ? <Calculator job={job} onChange={(next) => setJob({ ...next, updatedAt: new Date().toISOString() })} /> : null}

      {tab === "job" ? (
        <div className="stack">
          <ProfitHero net={service ? serviceCompute(job, now).net : compute(job).net} />
          <div className="stepper" role="group" aria-label="Status">
            {SERVICE_STATUSES.map((status) => (
              <button key={status.id} type="button" className={job.status === status.id ? "on" : ""} onClick={() => {
                const next = { ...job, status: status.id as JobStatus } as JobRecord;
                setJob(next);
                if (isFinished(status.id)) void persist(next).then(() => onFinished());
              }}>
                <strong>{status.sq}</strong>
                <small>{status.en}</small>
              </button>
            ))}
          </div>
          <div className="card stack">
            <Field label="Customer name (emri i klientit)">
              <input value={job.customerName} onChange={(event) => patch({ customerName: event.target.value })} />
            </Field>
            <Field label="Phone (telefoni)">
              <input type="tel" value={job.phone} onChange={(event) => patch({ phone: event.target.value })} />
            </Field>
            {job.phone ? <a className="btn" href={`tel:${job.phone}`}>Call (telefono)</a> : null}
            <Field label="Address (adresa)">
              <textarea value={job.address} onChange={(event) => patch({ address: event.target.value })} />
            </Field>
            {job.address.trim() ? (
              <a className="btn" href={mapsUrl(job.address)} target="_blank" rel="noreferrer">Open in Maps (hap në hartë)</a>
            ) : (
              <p className="hint">Add an address to open the map. (Shto adresën për hartën.)</p>
            )}
            <Field label="Scheduled date (data e planifikuar)">
              <input type="date" value={job.date} onChange={(event) => patch({ date: event.target.value })} />
            </Field>
            <p className="hint">{job.date ? formatDate(job.date) : "No date yet"}</p>
          </div>

          {service ? (
            <ServiceForm job={job as ServiceJob} onChange={(next) => setJob({ ...next, updatedAt: new Date().toISOString() })} />
          ) : (
            <Equipment job={job as InstallJob} onChange={(next) => setJob({ ...next, updatedAt: new Date().toISOString() })} />
          )}

          <div className="card">
            <Field label="Notes (shënime)">
              <textarea value={job.notes} onChange={(event) => patch({ notes: event.target.value })} />
            </Field>
          </div>
          <div className="actions">
            <button type="button" className="btn gold" onClick={() => onPrint("quote")}>
              {service ? "Service report (raporti)" : "Customer quote (ofertë)"}
            </button>
            {service ? null : (
              <button type="button" className="btn" onClick={() => onPrint("internal")}>My cost sheet (kostoja ime)</button>
            )}
            <button type="button" className="btn" onClick={() => onDuplicate(job)}>Duplicate (kopjo)</button>
            <button type="button" className="btn danger" onClick={onDelete}>Delete (fshi)</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Equipment({ job, onChange }: { job: InstallJob; onChange: (job: InstallJob) => void }) {
  const set = <K extends keyof InstallJob>(key: K, value: InstallJob[K]) => onChange({ ...job, [key]: value });
  return (
    <div className="card stack">
      <h2>Equipment (pajisja)</h2>
      <p className="hint">Kept for the next cleaning or a warranty visit. Size for the price list is {job.size}.</p>
      <Field label="Brand (marka)">
        <input value={job.brand} onChange={(event) => set("brand", event.target.value)} />
      </Field>
      <Field label="Model (modeli)">
        <input value={job.model} onChange={(event) => set("model", event.target.value)} />
      </Field>
      <Field label="Serial (numri serial)">
        <input value={job.serial} onChange={(event) => set("serial", event.target.value)} />
      </Field>
      <Field label="BTU">
        <input inputMode="numeric" value={job.btu} onChange={(event) => set("btu", event.target.value)} />
      </Field>
      <Field label="Refrigerant (gazi i njësisë)">
        <input value={job.refrigerant} onChange={(event) => set("refrigerant", event.target.value)} />
      </Field>
      <Field label="Install date (data e instalimit)">
        <input type="date" value={job.installDate} onChange={(event) => set("installDate", event.target.value)} />
      </Field>
    </div>
  );
}
