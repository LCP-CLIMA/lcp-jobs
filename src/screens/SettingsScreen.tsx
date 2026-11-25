import { useState } from "react";
import { buildBackup, readBackup, shareOrDownload } from "../lib/backup";
import { askPersist, getAllPhotos, getOffers, replaceAll, saveSettings, storageEstimate } from "../lib/db";
import { APP_VERSION } from "../lib/version";
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
      <p className="version-label" data-testid="settings-version">Versioni {APP_VERSION}</p>
      <Section title="Lista e çmimeve" caption="Blerja dhe shitja për çdo artikull. Te puna, shtyp Shto dhe pastaj ndrysho shumën.">
        <div className="stack">
          {(settings.priceBook ?? []).map((item) => (
            <div key={item.id} className="line">
              <strong>{item.name}</strong>
              <div className="row">
                <Field label="Blerje">
                  <span className="hint">Blerja</span>
                  <input inputMode="decimal" value={item.buy} onChange={(event) => update({ priceBook: settings.priceBook.map((row) => row.id === item.id ? { ...row, buy: event.target.value } : row) })} />
                </Field>
                <Field label="Shitje">
                  <span className="hint">Shitja</span>
                  <input inputMode="decimal" value={item.sell} onChange={(event) => update({ priceBook: settings.priceBook.map((row) => row.id === item.id ? { ...row, sell: event.target.value } : row) })} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => update({ priceBook: [...(settings.priceBook ?? []), { id: crypto.randomUUID(), name: "Artikull i ri", group: "other", buy: "", sell: "" } satisfies BookItem] })}>Shto artikull</button>
        </div>
      </Section>
      <div className="callout">
        <strong>TVSH</strong>
        <p>L.C.P është me TVSH. Fitimi është çmimi me TVSH, minus TVSH-në që i mbetet shtetit, minus kostot. 125,000 − 103,000 = 22,000 para asaj TVSH-je; rreth 3,667 Lek shkojnë te shteti, ndaj fitimi është rreth 18,333.</p>
      </div>
      <div className="callout">
        <strong>Vetëm punët e reja</strong>
        Këto çmime kopjohen kur hap një punë. Punët e ruajtura nuk ndryshojnë.
      </div>
      <Section title="TVSH">
        <Toggle label="L.C.P CLIMA është subjekt i TVSH" checked={settings.vatReg} onChange={(vatReg) => update({ vatReg })} />
        <Field label="Tatimi mbi fitimin">
          <select value={settings.taxRate} onChange={(event) => update({ taxRate: event.target.value })}>
            <option value="0">0%</option>
            <option value="15">15%</option>
          </select>
        </Field>
        <Num label="Kursi EUR → Lek" value={settings.rate} onChange={(rate) => update({ rate })} />
        <Field label="Telefoni i kompanisë në ofertë">
          <input type="tel" value={settings.companyPhone} placeholder="+355 69 852 7648" onChange={(event) => update({ companyPhone: event.target.value })} />
        </Field>
        <h3>Paketat e garancisë</h3>
        <p className="hint">Shfaqen te oferta. Ndrysho çmimin për madhësinë që po ofron.</p>
        {(settings.warrantyPackages ?? []).map((item) => (
          <div key={item.id} className="line">
            <Field label="Emri">
              <input value={item.name} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, name: event.target.value } : pack) })} />
            </Field>
            <Field label="Çmimi, Lek">
              <input inputMode="decimal" value={item.price} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, price: event.target.value } : pack) })} />
            </Field>
            <Field label="Përshkrimi">
              <textarea value={item.detail} onChange={(event) => update({ warrantyPackages: settings.warrantyPackages.map((pack) => pack.id === item.id ? { ...pack, detail: event.target.value } : pack) })} />
            </Field>
            <button type="button" className="btn danger" onClick={() => update({ warrantyPackages: settings.warrantyPackages.filter((pack) => pack.id !== item.id) })}>Fshi</button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => update({ warrantyPackages: [...(settings.warrantyPackages ?? []), { id: crypto.randomUUID(), name: "New package (paketë e re)", price: "0", detail: "" }] })}>
          Shto paketë
        </button>
      </Section>

      <Section title="Tarifat e servisit" caption="Vizita e parë është 3,000 Lek: 1 orë kontroll i përgjithshëm për të kuptuar problemin. Pastaj 2,000 Lek për çdo 30 min të filluara. Pas 15 km vajtje, 30 Lek për çdo kilometër vajtje-ardhje.">
        <div className="stack">
          <Num label="Vizita e parë, me TVSH (1 orë kontroll i përgjithshëm)" value={settings.callOut} onChange={(callOut) => update({ callOut })} />
          <Num label="Çdo 30 min të filluara, me TVSH" value={settings.halfHour} onChange={(halfHour) => update({ halfHour })} />
          <Num label="Zona falas, km vajtje" value={settings.freeKm} onChange={(freeKm) => update({ freeKm })} />
          <Num label="Lek për km shtesë vajtje-ardhje, me TVSH" value={settings.perExtraKm} onChange={(perExtraKm) => update({ perExtraKm })} />
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

      <Section title="Hak pune dhe paketa">
        <div className="stack">
          <Num label="Hak pune 12k" value={settings.labor["12k"]} onChange={(value) => update({ labor: { ...settings.labor, "12k": value } })} />
          <Num label="Hak pune 18k" value={settings.labor["18k"]} onChange={(value) => update({ labor: { ...settings.labor, "18k": value } })} />
          <Num label="Hak pune 24k" value={settings.labor["24k"]} onChange={(value) => update({ labor: { ...settings.labor, "24k": value } })} />
          <Num label="Paketa 12k" value={settings.package["12k"]} onChange={(value) => update({ package: { ...settings.package, "12k": value } })} />
          <Num label="Paketa 18k" value={settings.package["18k"]} onChange={(value) => update({ package: { ...settings.package, "18k": value } })} />
          <Num label="Paketa 24k" value={settings.package["24k"]} onChange={(value) => update({ package: { ...settings.package, "24k": value } })} />
          <Num label="Test vakumi + N₂" value={settings.vacuum} onChange={(vacuum) => update({ vacuum })} />
          <Num label="Tub shtesë, Lek/m" value={settings.extraRate} onChange={(extraRate) => update({ extraRate })} />
          <p className="hint">Përdoret te Tub shtesë në ofertë. Çdo paketë ka 3 m të përfshira. {Number(settings.extraRate) <= 0 ? "Duhet një vlerë." : `Tani ${settings.extraRate} Lek/m.`}</p>
        </div>
      </Section>

      <Section title="Tuba, kabllo, zorrë">
        <div className="stack">
          <Num label='1/4" Lek/m' value={settings.pipe["1/4"]} onChange={(value) => update({ pipe: { ...settings.pipe, "1/4": value } })} />
          <Num label='3/8" Lek/m' value={settings.pipe["3/8"]} onChange={(value) => update({ pipe: { ...settings.pipe, "3/8": value } })} />
          <Num label='1/2" Lek/m' value={settings.pipe["1/2"]} onChange={(value) => update({ pipe: { ...settings.pipe, "1/2": value } })} />
          <Num label='5/8" Lek/m' value={settings.pipe["5/8"]} onChange={(value) => update({ pipe: { ...settings.pipe, "5/8": value } })} />
          <Num label="Kabllo 3x2.5, Lek/m" value={settings.cable3} onChange={(cable3) => update({ cable3 })} />
          <Num label="Kabllo 5x1.5, Lek/m" value={settings.cable5} onChange={(cable5) => update({ cable5 })} />
          <Num label="Zorrë drenazhi, Lek/m" value={settings.drain} onChange={(drain) => update({ drain })} />
        </div>
      </Section>

      <Section title="Kanalina" caption="Metra × ky çmim. Parazgjedhja 700 Lek/m, pra 3 m janë 2,100 Lek.">
        <div className="stack">
          <Num label="Kanalina, Lek për metër" value={settings.trunkPerM} onChange={(trunkPerM) => update({ trunkPerM })} />
          <Num label="Dalje muri" value={settings.wall} onChange={(wall) => update({ wall })} />
          <Num label="Dalje këndi" value={settings.corner} onChange={(corner) => update({ corner })} />
          <Num label="Bashkues" value={settings.coupling} onChange={(coupling) => update({ coupling })} />
          <Num label="Kapak fundor" value={settings.endCap} onChange={(endCap) => update({ endCap })} />
          <Num label="Bërryl" value={settings.elbow} onChange={(elbow) => update({ elbow })} />
        </div>
      </Section>

      <Section title="Konsumabël dhe gaz">
        <div className="stack">
          <Num label="Shkumë, Lek" value={settings.foam} onChange={(foam) => update({ foam })} />
          <Num label="Silikon, Lek" value={settings.silicone} onChange={(silicone) => update({ silicone })} />
          <Num label="Çmimi i bombolës, Lek" value={settings.bottlePrice} onChange={(bottlePrice) => update({ bottlePrice })} />
          <Num label="Bombola, kg" value={settings.bottleKg} onChange={(bottleKg) => update({ bottleKg })} />
          <Num label="Shtesë gazi, g/m" value={settings.refGpm} onChange={(refGpm) => update({ refGpm })} />
        </div>
      </Section>

      <Section title="Furgoni" caption="Konsumi i parazgjedhur 5.4 Lek/km është vlerësim. Zëvendësoje me faturat e tua. Konsumimi nuk ka TVSH të zbritshme.">
        <div className="stack">
          <Num label="Naftë, Lek/L" value={settings.fuel} onChange={(fuel) => update({ fuel })} />
          <Num label="Konsumi, L/100 km" value={settings.cons} onChange={(cons) => update({ cons })} />
          <Num label="Konsumimi, Lek/km" value={settings.wear} onChange={(wear) => update({ wear })} />
          <Num label="Amortizimi, Lek/km" value={settings.depr} onChange={(depr) => update({ depr })} />
          <Num label="Sigurimi + taksa vjetore, Lek" value={settings.insYear} onChange={(insYear) => update({ insYear })} />
          <Num label="Km në vit" value={settings.kmYear} onChange={(kmYear) => update({ kmYear })} />
        </div>
      </Section>

      <Section title="Kopje rezervë" caption="Gjithçka ruhet në këtë telefon. Eksporto një kopje dhe mbaje te Dosjet, email-i ose një telefon tjetër. iPhone mund të fshijë të dhënat e një aplikacioni që nuk hapet për një kohë të gjatë.">
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              void (async () => {
                setMessage("Po përgatitet kopja…");
                const blob = await buildBackup({ jobs, settings, photos: await getAllPhotos(), offers: await getOffers() });
                const name = `lcp-clima-backup-${new Date().toISOString().slice(0, 10)}.zip`;
                setReadyFile({ blob, name });
                setMessage("Kopja është gati. Shtyp Shpërndaj ose ruaj.");
              })();
            }}
          >
            Eksporto kopjen
          </button>
          {readyFile ? (
            <button
              type="button"
              className="btn gold"
              onClick={() => {
                void shareOrDownload(readyFile.blob, readyFile.name).then(
                  () => setMessage("Kopja u nda ose u ruajt."),
                  () => setMessage("Shpërndarja u anulua."),
                );
              }}
            >
              Shpërndaj ose ruaj skedarin
            </button>
          ) : null}
          <label className="btn">
            Importo kopjen
            <input
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void readBackup(file).then(setPending).catch(() => setMessage("Nuk u lexua ai skedar."));
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
                const used = estimate.usage ? `${Math.round(estimate.usage / 1024)} KB` : "përdorimi i panjohur";
                setStorage(`${used}. Ruajtja e qëndrueshme: ${answer ? "e lejuar" : "e palejuar"}.`);
              })();
            }}
          >
            Kërko që iPhone ta mbajë këtë ruajtje
          </button>
          {storage ? <p className="hint">{storage}</p> : null}
          {message ? <p className="hint">{message}</p> : null}
        </div>
      </Section>

      {pending ? (
        <div className="card">
          <h2>Të zëvendësohet gjithçka në këtë telefon?</h2>
          <p>Skedari ka {pending.jobs.length} punë dhe {pending.photos.length} foto. Kjo fshin punët në këtë telefon.</p>
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
              Zëvendëso
            </button>
            <button type="button" className="btn" onClick={() => setPending(null)}>Anulo</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
