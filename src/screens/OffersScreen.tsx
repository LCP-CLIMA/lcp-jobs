import { useState } from "react";
import { lek, num } from "../lib/format";
import type { Offer, OfferLine, WarrantyPackage } from "../lib/types";
import { Field, IncomeAmount, Toggle } from "../ui";
import logo from "../assets/logo.jpg";
import { COMPANY } from "../lib/company";

function lineTotal(line: OfferLine): number {
  return num(line.qty) * num(line.price);
}

export function offerGross(offer: Offer, packages: WarrantyPackage[]): number {
  const lines = offer.lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const packs = packages.filter((item) => offer.packageIds.includes(item.id)).reduce((sum, item) => sum + num(item.price), 0);
  return lines + packs;
}

export function OfferHost({
  initial,
  packages,
  phone,
  onSaved,
  onDelete,
}: {
  initial: Offer;
  packages: WarrantyPackage[];
  phone: string;
  onSaved: (offer: Offer) => void;
  onDelete: () => void;
}) {
  const [offer, setOffer] = useState(initial);
  return (
    <OfferEditor
      offer={offer}
      packages={packages}
      phone={phone}
      onChange={setOffer}
      onSave={() => {
        const next = { ...offer, updatedAt: new Date().toISOString() };
        onSaved(next);
        setOffer(next);
      }}
      onDelete={onDelete}
    />
  );
}

export function OfferEditor({
  offer,
  packages,
  phone,
  onChange,
  onSave,
  onDelete,
}: {
  offer: Offer;
  packages: WarrantyPackage[];
  phone: string;
  onChange: (offer: Offer) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [askDelete, setAskDelete] = useState(false);
  const gross = offerGross(offer, packages);
  const net = gross / 1.2;
  const vat = gross - net;
  const setLine = (id: string, patch: Partial<OfferLine>) =>
    onChange({ ...offer, lines: offer.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) });

  return (
    <div className="stack">
      <button type="button" className="btn gold full" onClick={onSave}>Save offer (ruaj ofertën)</button>
      <section className="card stack">
        <Field label="Customer (klienti)">
          <input value={offer.customerName} onChange={(event) => onChange({ ...offer, customerName: event.target.value })} />
        </Field>
        <Field label="Phone (telefoni)">
          <input type="tel" value={offer.phone} onChange={(event) => onChange({ ...offer, phone: event.target.value })} />
        </Field>
        <Field label="Address (adresa)">
          <textarea value={offer.address} onChange={(event) => onChange({ ...offer, address: event.target.value })} />
        </Field>
        <Field label="Date (data)">
          <input type="date" value={offer.date} onChange={(event) => onChange({ ...offer, date: event.target.value })} />
        </Field>
        <Field label="Unit size (madhësia)">
          <select value={offer.size} onChange={(event) => onChange({ ...offer, size: event.target.value as Offer["size"] })}>
            <option value="">—</option>
            <option value="9k">9k</option>
            <option value="12k">12k</option>
            <option value="18k">18k</option>
            <option value="24k">24k</option>
          </select>
        </Field>
      </section>
      <section className="card stack">
        <h2>Prices (çmimet)</h2>
        <p className="hint">Enter VAT-inclusive amounts. The customer offer hides TVSH until you turn it on. (Çmimet me TVSH. Klienti nuk e sheh TVSH derisa ta ndezësh.)</p>
        {offer.lines.map((line) => (
          <div key={line.id} className="line">
            <Field label="Item (artikulli)">
              <input value={line.name} onChange={(event) => setLine(line.id, { name: event.target.value })} />
            </Field>
            <div className="row">
              <Field label="Qty (sasia)">
                <input inputMode="decimal" value={line.qty} onChange={(event) => setLine(line.id, { qty: event.target.value })} />
              </Field>
              <Field label="Price, Lek (çmimi)">
                <input inputMode="decimal" value={line.price} onChange={(event) => setLine(line.id, { price: event.target.value })} />
              </Field>
            </div>
            <div className="line-foot">
              <IncomeAmount value={lineTotal(line)} />
              <button type="button" className="btn danger" onClick={() => onChange({ ...offer, lines: offer.lines.filter((item) => item.id !== line.id) })}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => onChange({ ...offer, lines: [...offer.lines, { id: crypto.randomUUID(), name: "", qty: "1", price: "" }] })}>
          Add line (shto rresht)
        </button>
      </section>
      <section className="card stack">
        <h2>Warranty / membership (garancia / abonimi)</h2>
        {packages.length === 0 ? <p className="hint">Add packages in Settings. (Shto paketa te Cilësimet.)</p> : null}
        {packages.map((item) => {
          const on = offer.packageIds.includes(item.id);
          return (
            <label key={item.id} className="check-row">
              <input
                type="checkbox"
                checked={on}
                onChange={(event) => onChange({
                  ...offer,
                  packageIds: event.target.checked ? [...offer.packageIds, item.id] : offer.packageIds.filter((id) => id !== item.id),
                })}
              />
              <span>{item.name} · <IncomeAmount value={num(item.price)} /></span>
            </label>
          );
        })}
        {packages.filter((item) => offer.packageIds.includes(item.id)).map((item) => (
          <p key={item.id} className="hint">{item.detail}</p>
        ))}
      </section>
      <section className="card stack">
        <Toggle label="Show TVSH on the offer (shfaq TVSH në ofertë)" checked={offer.showVat} onChange={(showVat) => onChange({ ...offer, showVat })} />
        <article className="print-sheet">
          <img className="offer-logo" src={logo} alt="L.C.P Clima" />
          <h1>{COMPANY.brand}</h1>
          <p>{phone || "Set the company phone in Settings. (Vendos telefonin te Cilësimet.)"}</p>
          <h2>OFERTË</h2>
          <p><b>Klienti:</b> {offer.customerName || "—"}</p>
          {offer.size ? <p><b>Madhësia:</b> {offer.size}</p> : null}
          {offer.lines.filter((line) => line.name || lineTotal(line)).map((line) => (
            <div key={line.id} className="kv"><span>{line.name || "Artikull"} × {line.qty}</span><IncomeAmount value={offer.showVat ? lineTotal(line) : lineTotal(line) / 1.2} /></div>
          ))}
          {packages.filter((item) => offer.packageIds.includes(item.id)).map((item) => (
            <div key={item.id} className="kv"><span>{item.name}</span><IncomeAmount value={offer.showVat ? num(item.price) : num(item.price) / 1.2} /></div>
          ))}
          {offer.showVat ? (
            <>
              <div className="kv"><span>Nëntotali pa TVSH</span><IncomeAmount value={net} /></div>
              <div className="kv"><span>TVSH 20%</span><b className="money neg">{lek(vat)}</b></div>
              <div className="kv total-line"><span>Totali me TVSH</span><IncomeAmount value={gross} /></div>
            </>
          ) : (
            <div className="kv total-line"><span>Çmimi</span><IncomeAmount value={net} /></div>
          )}
          <div className="sign"><strong>{COMPANY.brand}</strong>{phone ? <div>{phone}</div> : null}</div>
        </article>
        <button type="button" className="btn" onClick={() => window.print()}>Print offer (printo ofertën)</button>
        <button type="button" className="btn danger" onClick={() => setAskDelete(true)}>Delete offer (fshi ofertën)</button>
        {askDelete ? (
          <div className="callout">
            <p>Delete this offer? (Fshi këtë ofertë?)</p>
            <button type="button" className="btn danger" onClick={onDelete}>Yes (po)</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function OfferList({ offers, onOpen, onNew }: { offers: Offer[]; onOpen: (id: string) => void; onNew: () => void }) {
  return (
    <div className="stack">
      <button type="button" className="btn gold" onClick={onNew}>New offer (ofertë e re)</button>
      {offers.length === 0 ? <p>No offers yet (ende pa oferta).</p> : null}
      {offers.map((offer) => (
        <button key={offer.id} type="button" className="job" onClick={() => onOpen(offer.id)}>
          <strong>{offer.customerName || "Untitled offer (pa emër)"}</strong>
          <span className="meta">{offer.date}{offer.size ? ` · ${offer.size}` : ""}</span>
        </button>
      ))}
    </div>
  );
}
