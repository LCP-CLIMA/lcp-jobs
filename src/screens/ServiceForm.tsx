import { useEffect, useState } from "react";
import { deletePhoto, getPhotos, putPhoto } from "../lib/db";
import { blankServiceRow } from "../lib/defaults";
import { lek, num } from "../lib/format";
import { compressImage, newPhoto } from "../lib/photos";
import { liveMinutes, serviceCompute } from "../lib/service";
import type { PhotoRecord, ServiceJob } from "../lib/types";
import { CostAmount, Field, IncomeAmount, Money, Section, Toggle } from "../ui";

function formatClock(minutes: number, running: boolean): string {
  if (!running) return `${Math.round(minutes)} min`;
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function ServiceForm({ job, onChange }: { job: ServiceJob; onChange: (job: ServiceJob) => void }) {
  const running = job.timerStartedAt != null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const result = serviceCompute(job, now);
  const set = <K extends keyof ServiceJob>(key: K, value: ServiceJob[K]) => onChange({ ...job, [key]: value });

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Cost checklist (lista e kostove)</h2>
        <label className="check-row"><input type="checkbox" checked={job.includeVisit !== false} onChange={(event) => set("includeVisit", event.target.checked)} /><span>Vizita e parë {lek(num(job.callOut))}</span></label>
        <label className="check-row"><input type="checkbox" checked={job.includeTime !== false} onChange={(event) => set("includeTime", event.target.checked)} /><span>Extra time (koha shtesë) 2,000 Lek / 30 min</span></label>
        <label className="check-row"><input type="checkbox" checked={job.includeTravel !== false} onChange={(event) => set("includeTravel", event.target.checked)} /><span>Travel beyond 15 km (rruga) 30 Lek/km</span></label>
        <label className="check-row"><input type="checkbox" checked={job.includeMaterials !== false} onChange={(event) => set("includeMaterials", event.target.checked)} /><span>Materials at cost (materialet)</span></label>
        <label className="check-row"><input type="checkbox" checked={job.includeGas !== false} onChange={(event) => set("includeGas", event.target.checked)} /><span>Gas at cost (gazi)</span></label>
      </section>
      <div className="card">
        <div className="kv"><span>Price to charge, incl. 20% VAT (çmimi me TVSH)</span><IncomeAmount value={result.sell} /></div>
        <div className="kv"><span>Real cost (kosto reale)</span><CostAmount value={result.costReal} /></div>
        <div className="kv"><span>Net profit (fitim neto)</span><Money value={result.net} /></div>
        {num(job.callOut) === 0 && num(job.halfHour) === 0 && num(job.perExtraKm) === 0 ? (
          <p className="hint">Call-out rates are still 0. Set them in Settings, or for this visit below, when you are ready. (Tarifat janë 0 derisa t’i vendosësh.)</p>
        ) : null}
      </div>

      <div className="timer">
        <div>
          <span>Time on site (koha në vend)</span>
          <b>{formatClock(liveMinutes(job, now), running)}</b>
        </div>
        <button
          type="button"
          className="btn gold"
          onClick={() => {
            if (running) {
              const total = Math.round(liveMinutes(job));
              onChange({ ...job, minutes: String(Math.max(0, total)), timerStartedAt: null });
            } else {
              onChange({ ...job, timerStartedAt: Date.now() });
            }
          }}
        >
          {running ? "Stop (ndalo)" : "Start (nis)"}
        </button>
      </div>
      <Field label="Minutes, manual (minuta)">
        <input inputMode="numeric" value={job.minutes} onChange={(event) => set("minutes", event.target.value)} />
      </Field>
      <p className="hint">
        Vizita e parë është 1 orë kontroll i përgjithshëm. Pastaj çdo 30 minuta të filluara shtojnë tarifën.
        This visit: {result.blocks} extra block{result.blocks === 1 ? "" : "s"} = {lek(result.timeCharge)}.
        (Ora e parë është në dalje. Pastaj çdo 30 min të filluara.)
      </p>

      <Section title="The visit (vizita)">
        <div className="stack">
          <Field label="Problem reported (problemi i raportuar)">
            <textarea value={job.problem} onChange={(event) => set("problem", event.target.value)} />
          </Field>
          <Field label="What was found (çfarë u gjet)">
            <textarea value={job.found} onChange={(event) => set("found", event.target.value)} />
          </Field>
          <Field label="What was done (çfarë u bë)">
            <textarea value={job.done} onChange={(event) => set("done", event.target.value)} />
          </Field>
          <Field label="One-way km (km vetëm vajtje)">
            <input inputMode="decimal" value={job.km} onChange={(event) => set("km", event.target.value)} />
          </Field>
          <p className="hint">
            Driving cost uses the round trip × (fuel + {num(job.wear)} Lek/km wear) = {lek(result.transportGross)}. Wear has no deductible VAT.
            Kilometres past the free one-way zone ({job.freeKm || "0"} km) are billed both ways: {result.extraKm} km × {lek(num(job.perExtraKm))} = {lek(result.kmCharge)}.
          </p>
        </div>
      </Section>

      <Section title="Materials used (materialet)" caption="Added to the customer price only if the repair is accepted. (Shtohen vetëm nëse riparimi pranohet.)">
        <div className="stack">
          {job.materials.map((row) => (
            <div key={row.id} className="line">
              <Field label="Item (artikulli)">
                <input value={row.name} onChange={(event) => set("materials", job.materials.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} />
              </Field>
              <div className="row">
                <Field label="Qty (sasia)">
                  <input inputMode="decimal" value={row.qty} onChange={(event) => set("materials", job.materials.map((item) => item.id === row.id ? { ...item, qty: event.target.value } : item))} />
                </Field>
                <Field label="Unit price, Lek">
                  <input inputMode="decimal" value={row.price} onChange={(event) => set("materials", job.materials.map((item) => item.id === row.id ? { ...item, price: event.target.value } : item))} />
                </Field>
              </div>
              <div className="line-foot">
                <Toggle label="VAT invoice (faturë me TVSH)" checked={row.vat} onChange={(vat) => set("materials", job.materials.map((item) => item.id === row.id ? { ...item, vat } : item))} />
                <button type="button" className="btn danger" onClick={() => set("materials", job.materials.filter((item) => item.id !== row.id))}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => set("materials", [...job.materials, blankServiceRow()])}>Add material (shto material)</button>
        </div>
      </Section>

      <Section title="Gas (gazi)" caption="Bottle default 12,500 Lek. Grams are added to the price only if the repair is accepted.">
        <div className="stack">
          <Field label="Grams added (gramë)">
            <input inputMode="decimal" value={job.refG} onChange={(event) => set("refG", event.target.value)} />
          </Field>
          <div className="row">
            <Field label="Bottle price, Lek">
              <input inputMode="decimal" value={job.bottlePrice} onChange={(event) => set("bottlePrice", event.target.value)} />
            </Field>
            <Field label="Bottle kg">
              <input inputMode="decimal" value={job.bottleKg} onChange={(event) => set("bottleKg", event.target.value)} />
            </Field>
          </div>
          <Toggle label="Gas bought with VAT invoice" checked={job.refVat} onChange={(value) => set("refVat", value)} />
          <p>{num(job.refG)} g = {lek(result.gasGross)}.</p>
        </div>
      </Section>

      <details className="card">
        <summary>Rates and fuel for this call (tarifat)</summary>
        <div className="stack">
          <p className="hint">New calls copy Settings. These numbers belong to this visit only. Vizita e parë është {lek(num(job.callOut))}: 1 orë kontroll i përgjithshëm. Pastaj 2,000 Lek për çdo 30 min të filluara, dhe 30 Lek për çdo km vajtje-ardhje pas 15 km.</p>
          <Field label="Vizita e parë, me TVSH (1 orë kontroll)">
            <input data-testid="call-out" inputMode="decimal" value={job.callOut} onChange={(event) => set("callOut", event.target.value)} />
          </Field>
          <Field label="Extra per started 30 min, incl. VAT">
            <input inputMode="decimal" value={job.halfHour} onChange={(event) => set("halfHour", event.target.value)} />
          </Field>
          <Field label="Free km zone, one-way (zona falas)">
            <input inputMode="decimal" value={job.freeKm} onChange={(event) => set("freeKm", event.target.value)} />
          </Field>
          <Field label="Lek per extra round-trip km, incl. VAT">
            <input inputMode="decimal" value={job.perExtraKm} onChange={(event) => set("perExtraKm", event.target.value)} />
          </Field>
          <Field label="Diesel today, Lek/L (nafta sot)">
            <input inputMode="decimal" value={job.fuel} onChange={(event) => set("fuel", event.target.value)} />
          </Field>
          <Field label="Consumption, L/100 km">
            <input inputMode="decimal" value={job.cons} onChange={(event) => set("cons", event.target.value)} />
          </Field>
          <Field label="Wear, Lek/km (default 5.4)">
            <input inputMode="decimal" value={job.wear} onChange={(event) => set("wear", event.target.value)} />
          </Field>
          <Toggle label="Fuel bought with VAT invoice" checked={job.fuelVat} onChange={(value) => set("fuelVat", value)} />
          <Toggle label="L.C.P CLIMA is VAT-registered" checked={job.vatReg} onChange={(value) => set("vatReg", value)} />
        </div>
      </details>

      <Section title="WhatsApp pre-check (kontrolli falas në WhatsApp)" caption="Free. The customer sends photos or a short video before you drive out. Log it here and attach those files. (Falas. Klienti dërgon foto ose video.)">
        <div className="stack">
          <Field label="What they sent (çfarë dërguan)">
            <textarea value={job.whatsappLog} onChange={(event) => set("whatsappLog", event.target.value)} />
          </Field>
          <WhatsAppFiles jobId={job.id} />
        </div>
      </Section>

      <Section title="Repair (riparimi)" caption="The on-site visit fee is deducted if they accept the repair. If they decline, they pay only the visit. (Nëse e pranon, tarifa e vizitës zbritet. Nëse jo, paguan vetëm vizitën.)">
        <div className="stack">
          <h3>Opsionet e riparimit</h3>
          <p className="hint">Çmimet 0 duan një vlerë. Nuk është vënë çmim tregu. Zgjidhen këtu dhe i shtohen çmimit kur riparimi pranohet.</p>
          {(job.repairOptions ?? []).map((option) => (
            <div key={option.id} className="line" data-testid={`repair-${option.id}`}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={option.enabled}
                  onChange={(event) => set("repairOptions", (job.repairOptions ?? []).map((item) => item.id === option.id ? { ...item, enabled: event.target.checked } : item))}
                />
                <span>{option.name}</span>
              </label>
              <Field label="Çmimi, Lek">
                <input
                  inputMode="decimal"
                  value={option.price}
                  onChange={(event) => set("repairOptions", (job.repairOptions ?? []).map((item) => item.id === option.id ? { ...item, price: event.target.value } : item))}
                />
              </Field>
              {num(option.price) <= 0 ? <p className="warn">Duhet një vlerë.</p> : null}
            </div>
          ))}
          <Toggle label="Repair accepted (riparimi u pranua)" checked={job.repairAccepted} onChange={(repairAccepted) => set("repairAccepted", repairAccepted)} />
          <Field label="Repair price, incl. VAT (çmimi i riparimit)">
            <input inputMode="decimal" value={job.repairPrice} onChange={(event) => set("repairPrice", event.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Price breakdown (çmimi)">
        <div className="kv"><span>Visit fee (tarifa e vizitës)</span><b>{lek(result.visitFee)}</b></div>
        <div className="kv"><span>Vizita e parë</span><b>{lek(result.callOut)}</b></div>
        {(job.repairOptions ?? []).filter((option) => option.enabled).map((option) => (
          <div key={option.id} className="kv"><span>{option.name}</span><b>{lek(num(option.price))}</b></div>
        ))}
        <div className="kv"><span>Extra time ({result.blocks} × 30 min)</span><b>{lek(result.timeCharge)}</b></div>
        <div className="kv"><span>Extra km, round trip ({result.extraKm} km)</span><b>{lek(result.kmCharge)}</b></div>
        {job.repairAccepted ? <div className="kv"><span>Repair (riparimi)</span><b>{lek(result.repair)}</b></div> : null}
        {job.repairAccepted ? <div className="kv"><span>Materials (materiale)</span><b>{lek(result.materialsGross)}</b></div> : null}
        {job.repairAccepted ? <div className="kv"><span>Gas (gaz)</span><b>{lek(result.gasGross)}</b></div> : null}
        {job.repairAccepted ? <div className="kv"><span>Visit fee deducted (zbritja e vizitës)</span><b>−{Math.round(result.visitCredit).toLocaleString("en-US")} Lek</b></div> : null}
        <div className="kv"><span>Driving cost, round trip (kosto rruge)</span><b>{lek(result.transportGross)}</b></div>
        <div className="kv total-line"><span>Price incl. VAT</span><b>{lek(result.sell)}</b></div>
        <div className="kv"><span>Net profit</span><Money value={result.net} /></div>
      </Section>
    </div>
  );
}

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function WhatsAppThumb({ photo }: { photo: PhotoRecord }) {
  const url = useObjectUrl(photo.blob);
  if (!url) return null;
  if (photo.blob.type.startsWith("video")) return <video src={url} muted />;
  return <img src={url} alt={photo.caption || "WhatsApp"} />;
}

function WhatsAppFiles({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPhotos(jobId).then((list) => setPhotos(list.filter((photo) => photo.tag === "whatsapp")));
  }, [jobId]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        const blob = file.type.startsWith("video/") ? file : await compressImage(file);
        if (blob.size > 12_000_000) throw new Error("too big");
        const photo = newPhoto(jobId, blob, "whatsapp");
        await putPhoto(photo);
        next.push(photo);
      }
      setPhotos(next);
    } catch {
      setError("Could not attach that file. Use a photo or a short video. (Nuk u ngjit.)");
    }
  }

  return (
    <div className="stack">
      <label className="btn">
        Attach WhatsApp photo or video (ngjit foto/video)
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(event) => {
            void add(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {error ? <p className="warn">{error}</p> : null}
      {photos.length === 0 ? <p className="hint">No WhatsApp files yet (ende pa foto nga WhatsApp).</p> : null}
      <div className="photos">
        {photos.map((photo) => (
          <div key={photo.id} className="shot">
            <WhatsAppThumb photo={photo} />
            <button
              type="button"
              className="tag"
              onClick={() => {
                void deletePhoto(photo.id);
                setPhotos((list) => list.filter((item) => item.id !== photo.id));
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
