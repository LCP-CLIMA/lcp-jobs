import { useEffect, useState } from "react";
import { saveJob } from "../lib/db";
import { lek } from "../lib/format";
import { emptyMoney, moneyTotals } from "../lib/simple";
import type { JobMoney, JobRecord } from "../lib/types";
import { Field, Money } from "../ui";

function Line({ label, hint, value, onChange, testId }: { label: string; hint: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return (
    <Field label={label}>
      <span className="hint">{hint}</span>
      <input data-testid={testId} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function JobForm({
  initial,
  onSaved,
  onDirty,
  onDelete,
}: {
  initial: JobRecord;
  onSaved: (job: JobRecord) => void;
  onDirty: (dirty: boolean) => void;
  onDelete: () => void;
}) {
  const [job, setJob] = useState(initial);
  const [savedAt, setSavedAt] = useState("");
  const money = job.money ?? emptyMoney();
  const totals = moneyTotals(money);
  const dirty = JSON.stringify(job) !== JSON.stringify(initial) && savedAt !== JSON.stringify(job);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  function setMoney(patch: Partial<JobMoney>) {
    setJob({ ...job, money: { ...money, ...patch } });
    setSavedAt("");
  }
  function setField<K extends keyof JobRecord>(key: K, value: JobRecord[K]) {
    setJob({ ...job, [key]: value } as JobRecord);
    setSavedAt("");
  }

  async function save() {
    const next = { ...job, updatedAt: new Date().toISOString() };
    await saveJob(next);
    setJob(next);
    setSavedAt(JSON.stringify(next));
    onSaved(next);
    onDirty(false);
  }

  return (
    <div className="stack" data-testid="job-form">
      <section className="card stack">
        <h2>{job.kind === "service" ? "Service" : "Installation"} <small className="hint">{job.kind === "service" ? "Servis" : "Montim"}</small></h2>
        <Field label="Customer">
          <span className="hint">Klienti</span>
          <input value={job.customerName} onChange={(event) => setField("customerName", event.target.value)} />
        </Field>
        <Field label="Phone">
          <span className="hint">Telefoni</span>
          <input type="tel" value={job.phone} onChange={(event) => setField("phone", event.target.value)} />
        </Field>
        <Field label="Address">
          <span className="hint">Adresa</span>
          <textarea value={job.address} onChange={(event) => setField("address", event.target.value)} />
        </Field>
        <Field label="Date">
          <span className="hint">Data</span>
          <input type="date" value={job.date} onChange={(event) => setField("date", event.target.value)} />
        </Field>
      </section>

      <section className="card stack">
        <Line label="Unit buy price (Lek)" hint="Çmimi i blerjes së njësisë" value={money.unitBuy} onChange={(unitBuy) => setMoney({ unitBuy })} testId="unit-buy" />
      </section>

      <section className="card stack">
        <h2>Materials <small className="hint">Materialet · {lek(totals.materials)}</small></h2>
        <Line label="Pipes / copper (Lek)" hint="Tuba / bakër" value={money.matPipes} onChange={(matPipes) => setMoney({ matPipes })} />
        <Line label="Insulation (Lek)" hint="Izolimi" value={money.matInsulation} onChange={(matInsulation) => setMoney({ matInsulation })} />
        <Line label="Cable (Lek)" hint="Kabllo" value={money.matCable} onChange={(matCable) => setMoney({ matCable })} />
        <Line label="Bracket (Lek)" hint="Mbajtësja" value={money.matBracket} onChange={(matBracket) => setMoney({ matBracket })} />
        <Line label="Drain (Lek)" hint="Drenazhi" value={money.matDrain} onChange={(matDrain) => setMoney({ matDrain })} />
        <Line label="Gas top-up (Lek)" hint="Mbushje gazi" value={money.matGas} onChange={(matGas) => setMoney({ matGas })} />
        <Line label="Other materials (Lek)" hint="Materiale të tjera" value={money.matOther} onChange={(matOther) => setMoney({ matOther })} testId="materials" />
      </section>

      <section className="card stack">
        <h2>Extra costs <small className="hint">Kosto shtesë · {lek(totals.extras)}</small></h2>
        <Line label="Fuel / travel (Lek)" hint="Karburant / rruga" value={money.extraTravel} onChange={(extraTravel) => setMoney({ extraTravel })} testId="extras" />
        <Line label="Helper labour (Lek)" hint="Puna e ndihmësit" value={money.extraHelper} onChange={(extraHelper) => setMoney({ extraHelper })} />
        <Line label="Elevator / floor surcharge (Lek)" hint="Ashensori / kati" value={money.extraFloor} onChange={(extraFloor) => setMoney({ extraFloor })} />
        <Line label="Other extras (Lek)" hint="Të tjera" value={money.extraOther} onChange={(extraOther) => setMoney({ extraOther })} />
      </section>

      <section className="card stack">
        <Field label="Selling price to customer (Lek)">
          <span className="hint">Çmimi i shitjes për klientin</span>
          <input className="sell-input" data-testid="selling-price" inputMode="decimal" value={money.sellingPrice} onChange={(event) => setMoney({ sellingPrice: event.target.value })} />
        </Field>
      </section>

      <section className="live-totals" data-testid="job-totals">
        <div className="kv"><span>Total cost <small>Kostoja</small></span><b data-testid="total-cost">{lek(totals.cost)}</b></div>
        <div className="kv"><span>Selling price <small>Shitja</small></span><b data-testid="total-sell">{lek(totals.sell)}</b></div>
        <div className="kv"><span>Profit <small>Fitimi</small></span><Money value={totals.profit} /></div>
        <div className="kv"><span>Margin <small>Marzhi</small></span><b data-testid="margin">{totals.margin.toFixed(1)}%</b></div>
        <button type="button" className="btn gold full" data-testid="save-job" onClick={() => void save()}>{dirty ? "Save job" : "Saved"}</button>
        <button type="button" className="btn danger" onClick={onDelete}>Delete</button>
      </section>
    </div>
  );
}
