import { useState } from "react";
import { buildBackup, readBackup, shareOrDownload } from "../lib/backup";
import { askPersist, getAllPhotos, getOffers, replaceAll, saveSettings, storageEstimate } from "../lib/db";
import type { BookItem, JobRecord, Settings } from "../lib/types";
import { Field, Section, Toggle } from "../ui";

function Num({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function SettingsScreen({
  settings,
  jobs,
  onChange,
  onImported,
}: {
  settings: Settings;
  jobs: JobRecord[];
  onChange: (settings: Settings) => void;
  onImported: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Awaited<ReturnType<typeof readBackup>> | null>(null);
  const [readyFile, setReadyFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [storage, setStorage] = useState("");

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    onChange(next);
    void saveSettings(next);
  }

  return (
    <div className="stack">
      <Section title="Lista e çmimeve" caption="Price book. Buy and sell for each saved item. On a job, tap Shto and then edit the amount.">
        <div className="stack">
          {(settings.priceBook ?? []).map((item) => (
            <div key={item.id} className="line">
              <strong>{item.name}</strong>
              <div className="row">
                <Field label="Blerje">
                  <span className="hint">Buy</span>
                  <input inputMode="decimal" value={item.buy} onChange={(event) => update({ priceBook: settings.priceBook.map((row) => row.id === item.id ? { ...row, buy: event.target.value } : row) })} />
                </Field>
                <Field label="Shitje">
                  <span className="hint">Sell</span>
                  <input inputMode="decimal" value={item.sell} onChange={(event) => update({ priceBook: settings.priceBook.map((row) => row.id === item.id ? { ...row, sell: event.target.value } : row) })} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => update({ priceBook: [...(settings.priceBook ?? []), { id: crypto.randomUUID(), name: "Artikull i ri", group: "other", buy: "", sell: "" } satisfies BookItem] })}>Shto artikull · Add item</button>
        </div>
      </Section>
      <div className="callout">
        <strong>TVSH</strong>
        <p>L.C.P është me TVSH. Fitimi është çmimi me TVSH, minus TVSH-në që i mbetet shtetit, minus kostot. 125,000 − 103,000 = 22,000 para asaj TVSH-je; rreth 3,667 Lek shkojnë te shteti, ndaj fitimi është rreth 18,333.</p>
      </div>
      <div className="callout">
        <strong>New jobs only</strong>
        These prices are copied when you create a job. Jobs already saved keep their own numbers. (Punët e ruajtura nuk ndryshojnë.)
      </div>
      <Section title="VAT (TVSH)">
        <Toggle label="L.C.P CLIMA is VAT-registered (subjekt i TVSH)" checked={settings.vatReg} onChange={(vatReg) => update({ vatReg })} />
        <Field label="Default profit tax (tatim fitimi)">
          <select value={settings.taxRate} onChange={(event) => update({ taxRate: event.target.value })}>
            <option value="0">0%</option>
            <option value="15">15%</option>
          </select>
        </Field>
        <Num label="EUR → Lek rate" value={settings.rate} onChange={(rate) => update({ rate })} />
        <Field label="Company phone on the offer (telefoni i kompanisë në ofertë)">
          <input type="tel" value={settings.companyPhone} placeholder="+355 69 852 7648" onChange={(event) => update({ companyPhone: event.target.value })} />
        </Field>
        <h3>Warranty packages (paketat e garancisë)</h3>
        <p className="hint">Shown as checkboxes on each offer. Edit the price for the size you are quoting. (Shfaqen te oferta. Ndrysho çmimin për madhësinë.)</p>
        {(settings.warrantyPackages ?? []).map((item) => (
          <div key={item.id} className="line">
            <Field label="Name (emri)">
              <input value={item.name} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, name: event.target.value } : pack) })} />
            </Field>
            <Field label="Price, Lek (çmimi)">
              <input inputMode="decimal" value={item.price} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, price: event.target.value } : pack) })} />
            </Field>
            <Field label="Detail (përshkrimi)">
              <textarea value={item.detail} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, detail: event.target.value } : pack) })} />
            </Field>
            <button type="button" className="btn danger" onClick={() => update({ warrantyPackages: settings.warrantyPackages.filter((pack) => pack.id !== item.id) })}>Delete (fshi)</button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => update({ warrantyPackages: [...(settings.warrantyPackages ?? []), { id: crypto.randomUUID(), name: "New package (paketë e re)", price: "0", detail: "" }] })}>
          Add package (shto paketë)
        </button>
      </Section>

      <Section title="Service call rates (tarifat e servisit)" caption="Vizita e parë është 3,000 Lek: 1 orë kontroll i përgjithshëm për të kuptuar problemin. Pastaj 2,000 Lek për çdo 30 min të filluara. Pas 15 km vajtje, 30 Lek për çdo kilometër vajtje-ardhje.">
        <div className="stack">
          <Num label="Vizita e parë, me TVSH (1 orë kontroll i përgjithshëm)" value={settings.callOut} onChange={(callOut) => update({ callOut })} />
          <Num label="Extra per started 30 min, incl. VAT" value={settings.halfHour} onChange={(halfHour) => update({ halfHour })} />
          <Num label="Free km zone, one-way (zona falas)" value={settings.freeKm} onChange={(freeKm) => update({ freeKm })} />
          <Num label="Lek per extra round-trip km, incl. VAT" value={settings.perExtraKm} onChange={(perExtraKm) => update({ perExtraKm })} />
          <h3>Opsionet e riparimit</h3>
          <p className="hint">Çmimet e paracaktuara për punët e reja të servisit. 0 do të thotë që duhet një vlerë. Nuk është vënë çmim tregu. Punët e ruajtura mbajnë çmimin e tyre.</p>
          {(settings.repairCatalog ?? []).map((item) => (
            <div key={item.id} className="line">
              <Field label={item.name}>
                <input
                  inputMode="decimal"
                  value={item.price}
                  onChange={(event) => update({
                    repairCatalog: settings.repairCatalog.map((option) => option.id === item.id ? { ...option, price: event.target.value } : option),
                  })}
                />
              </Field>
              {Number(item.price) <= 0 ? <p className="warn">Duhet një vlerë.</p> : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Oferta — çmime shtesë">
        <div className="stack">
          <Num label="Garanci shtesë, Lek për vit" value={settings.extraWarrantyYear} onChange={(extraWarrantyYear) => update({ extraWarrantyYear })} />
          <Num label="Abonim vjetor, Lek për vit me pagesë" value={settings.membershipYear} onChange={(membershipYear) => update({ membershipYear })} />
          <Num label="Vinç/Lift, Lek për orë" value={settings.liftHour} onChange={(liftHour) => update({ liftHour })} />
          <Num label="Mur guri ose beton, Lek për gropë" value={settings.hardWallHole} onChange={(hardWallHole) => update({ hardWallHole })} />
          <p className="warn">Vend i përkohshëm. 1,000 Lek për çdo kat mbi tokë, pa ashensor. Ndryshoje kur ta konfirmosh.</p>
          <Num label="Pa ashensor, Lek për kat mbi tokë" value={settings.floorSurcharge} onChange={(floorSurcharge) => update({ floorSurcharge })} />
        </div>
      </Section>

      <Section title="Labor and packages (hak pune dhe paketa)">
        <div className="stack">
          <Num label="Labor 12k" value={settings.labor["12k"]} onChange={(value) => update({ labor: { ...settings.labor, "12k": value } })} />
          <Num label="Labor 18k" value={settings.labor["18k"]} onChange={(value) => update({ labor: { ...settings.labor, "18k": value } })} />
          <Num label="Labor 24k" value={settings.labor["24k"]} onChange={(value) => update({ labor: { ...settings.labor, "24k": value } })} />
          <Num label="Package 12k" value={settings.package["12k"]} onChange={(value) => update({ package: { ...settings.package, "12k": value } })} />
          <Num label="Package 18k" value={settings.package["18k"]} onChange={(value) => update({ package: { ...settings.package, "18k": value } })} />
          <Num label="Package 24k" value={settings.package["24k"]} onChange={(value) => update({ package: { ...settings.package, "24k": value } })} />
          <Num label="Vacuum + N₂ test" value={settings.vacuum} onChange={(vacuum) => update({ vacuum })} />
          <Num label="Extra pipe, Lek/m (Tub shtesë)" value={settings.extraRate} onChange={(extraRate) => update({ extraRate })} />
          <p className="hint">Përdoret te Tub shtesë në ofertë. Çdo paketë ka 3 m të përfshira. {Number(settings.extraRate) <= 0 ? "Duhet një vlerë." : `Tani ${settings.extraRate} Lek/m.`}</p>
        </div>
      </Section>

      <Section title="Pipes, cables, drain (tuba, kabllo, zorrë)">
        <div className="stack">
          <Num label='1/4" Lek/m' value={settings.pipe["1/4"]} onChange={(value) => update({ pipe: { ...settings.pipe, "1/4": value } })} />
          <Num label='3/8" Lek/m' value={settings.pipe["3/8"]} onChange={(value) => update({ pipe: { ...settings.pipe, "3/8": value } })} />
          <Num label='1/2" Lek/m' value={settings.pipe["1/2"]} onChange={(value) => update({ pipe: { ...settings.pipe, "1/2": value } })} />
          <Num label='5/8" Lek/m' value={settings.pipe["5/8"]} onChange={(value) => update({ pipe: { ...settings.pipe, "5/8": value } })} />
          <Num label="Cable 3x2.5, Lek/m" value={settings.cable3} onChange={(cable3) => update({ cable3 })} />
          <Num label="Cable 5x1.5, Lek/m" value={settings.cable5} onChange={(cable5) => update({ cable5 })} />
          <Num label="Drain hose, Lek/m" value={settings.drain} onChange={(drain) => update({ drain })} />
        </div>
      </Section>

      <Section title="Trunking (kanalina)" caption="Main run is metres × this price. Default 700 Lek/m, so 3 m stays 2,100 Lek.">
        <div className="stack">
          <Num label="Trunking, Lek per metre" value={settings.trunkPerM} onChange={(trunkPerM) => update({ trunkPerM })} />
          <Num label="Wall outlet" value={settings.wall} onChange={(wall) => update({ wall })} />
          <Num label="Corner outlet" value={settings.corner} onChange={(corner) => update({ corner })} />
          <Num label="Coupling" value={settings.coupling} onChange={(coupling) => update({ coupling })} />
          <Num label="End cap" value={settings.endCap} onChange={(endCap) => update({ endCap })} />
          <Num label="Plain elbow" value={settings.elbow} onChange={(elbow) => update({ elbow })} />
        </div>
      </Section>

      <Section title="Consumables and gas (konsumabël dhe gaz)">
        <div className="stack">
          <Num label="Foam, Lek" value={settings.foam} onChange={(foam) => update({ foam })} />
          <Num label="Silicone, Lek" value={settings.silicone} onChange={(silicone) => update({ silicone })} />
          <Num label="Gas bottle price, Lek" value={settings.bottlePrice} onChange={(bottlePrice) => update({ bottlePrice })} />
          <Num label="Bottle kg" value={settings.bottleKg} onChange={(bottleKg) => update({ bottleKg })} />
          <Num label="Extra charge, g/m" value={settings.refGpm} onChange={(refGpm) => update({ refGpm })} />
        </div>
      </Section>

      <Section title="Van (furgoni)" caption="Wear default 5.4 Lek/km is an estimate (tyres 1.35, oil/filters/service 1.35, brakes 0.70, repairs/parts 2.00). Replace it with your service bills. Wear has no deductible VAT.">
        <div className="stack">
          <Num label="Diesel, Lek/L" value={settings.fuel} onChange={(fuel) => update({ fuel })} />
          <Num label="Consumption, L/100 km" value={settings.cons} onChange={(cons) => update({ cons })} />
          <Num label="Wear, Lek/km" value={settings.wear} onChange={(wear) => update({ wear })} />
          <Num label="Depreciation, Lek/km" value={settings.depr} onChange={(depr) => update({ depr })} />
          <Num label="Insurance + road tax per year, Lek" value={settings.insYear} onChange={(insYear) => update({ insYear })} />
          <Num label="Km driven per year" value={settings.kmYear} onChange={(kmYear) => update({ kmYear })} />
        </div>
      </Section>

      <Section title="Backup (kopje rezervë)" caption="Everything is stored on this phone. Export a backup and keep the file in Files, email, or another phone. iPhone may delete data for an app that stays unused.">
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              void (async () => {
                setMessage("Preparing backup…");
                const blob = await buildBackup({ jobs, settings, photos: await getAllPhotos(), offers: await getOffers() });
                const name = `lcp-clima-backup-${new Date().toISOString().slice(0, 10)}.zip`;
                setReadyFile({ blob, name });
                setMessage("Backup is ready. Tap Share or save.");
              })();
            }}
          >
            Export backup (eksporto)
          </button>
          {readyFile ? (
            <button
              type="button"
              className="btn gold"
              onClick={() => {
                void shareOrDownload(readyFile.blob, readyFile.name).then(
                  () => setMessage("Backup shared or saved."),
                  () => setMessage("Share was cancelled."),
                );
              }}
            >
              Share or save the file (ndaj ose ruaj)
            </button>
          ) : null}
          <label className="btn">
            Import backup (importo)
            <input
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void readBackup(file).then(setPending).catch(() => setMessage("Could not read that file."));
              }}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void (async () => {
                const answer = await askPersist();
                const estimate = await storageEstimate();
                const used = estimate.usage ? `${Math.round(estimate.usage / 1024)} KB used` : "usage unknown";
                setStorage(`${used}. Persistent storage: ${answer ? "granted" : "not granted"}.`);
              })();
            }}
          >
            Ask iPhone to keep this data
          </button>
          {storage ? <p className="hint">{storage}</p> : null}
          {message ? <p className="hint">{message}</p> : null}
        </div>
      </Section>

      {pending ? (
        <div className="card">
          <h2>Replace everything on this phone?</h2>
          <p>The file has {pending.jobs.length} jobs and {pending.photos.length} photos. This deletes the jobs on this phone. (Zëvendëson të gjitha punët.)</p>
          <div className="actions">
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void replaceAll(pending).then(() => {
                  setPending(null);
                  onImported();
                });
              }}
            >
              Replace (zëvendëso)
            </button>
            <button type="button" className="btn" onClick={() => setPending(null)}>Cancel (anulo)</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
