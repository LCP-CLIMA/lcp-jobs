import { useState } from "react";
import { formatDate, lek } from "../lib/format";
import { applyOfferSize, customerLines, inverterLabel, quoteOffer, setCustomerVisible, shownAmount, showToCustomer } from "../lib/offer";
import type { Offer, OfferLine, Settings, WallType } from "../lib/types";
import { CustomerPage } from "./CustomerPage";
import { DateField, Field, IncomeAmount, Toggle } from "../ui";
import logo from "../assets/logo.jpg";
import { COMPANY } from "../lib/company";

export function OfferHost({
  initial,
  settings,
  onSaved,
  onDelete,
}: {
  initial: Offer;
  settings: Settings;
  onSaved: (offer: Offer) => void;
  onDelete: () => void;
}) {
  const [offer, setOffer] = useState(initial);
  return (
    <OfferEditor
      offer={offer}
      settings={settings}
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
  settings,
  onChange,
  onSave,
  onDelete,
}: {
  offer: Offer;
  settings: Settings;
  onChange: (offer: Offer) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [askDelete, setAskDelete] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const packages = settings.warrantyPackages ?? [];
  const quote = quoteOffer(offer, settings, packages);
  const visible = customerLines(offer, settings, packages);
  const showVatBreakdown = offer.showVat && showToCustomer(offer, "vat");
  const phone = settings.companyPhone;
  const years = offer.extraWarrantyYears ?? 0;
  const setLine = (id: string, patch: Partial<OfferLine>) =>
    onChange({ ...offer, lines: offer.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) });
  if (openSheet) {
    return (
      <div className="stack">
        <button type="button" className="btn no-print" onClick={() => setOpenSheet(false)}>Mbrapa te formulari</button>
        <CustomerPage
          customerName={offer.customerName}
          phone={offer.phone}
          address={offer.address}
          date={formatDate(offer.date)}
          description={inverterLabel(offer.size) || offer.lines[0]?.name || "Ofertë"}
          lines={visible.map((line) => ({ label: line.label, amount: shownAmount(line.gross, offer.showVat), detail: line.detail }))}
          total={quote.gross}
          net={quote.net}
          vat={quote.vat}
          showVat={showVatBreakdown}
          hasUnitPrice={quote.gross > 0}
          companyPhone={phone}
          tiers={[]}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="no-print stack">
        <button type="button" className="btn" data-testid="print-offer" onClick={() => setOpenSheet(true)}>Printo / Shpërndaj ofertën</button>
        <button type="button" className="btn gold full" onClick={onSave}>Ruaj</button>
        <section className="card stack">
          <Field label="Klienti">
            <input value={offer.customerName} onChange={(event) => onChange({ ...offer, customerName: event.target.value })} />
          </Field>
          <Field label="Telefoni">
            <input type="tel" value={offer.phone} onChange={(event) => onChange({ ...offer, phone: event.target.value })} />
          </Field>
          <Field label="Adresa">
            <textarea value={offer.address} onChange={(event) => onChange({ ...offer, address: event.target.value })} />
          </Field>
          <Field label="Data">
            <DateField value={offer.date} onChange={(date) => onChange({ ...offer, date })} />
          </Field>
          <Field label="Madhësia">
            <select
              data-testid="unit-size"
              value={offer.size}
              onChange={(event) => onChange(applyOfferSize(offer, event.target.value as Offer["size"]))}
            >
              <option value="">—</option>
              <option value="9k">9k</option>
              <option value="12k">12k</option>
              <option value="18k">18k</option>
              <option value="24k">24k</option>
            </select>
          </Field>
          {offer.size === "9k" ? <p className="hint">9k dhe 12k kanë të njëjtën kosto pune, 20,500 Lek.</p> : null}
          <div className="line">
            <div className="spread"><strong>Kosto pune</strong>{offer.size ? <IncomeAmount value={quote.lines.find((line) => line.key === "labor")?.gross ?? 0} /> : <span className="hint">Zgjidh madhësinë</span>}</div>
            <ShowCustomer offer={offer} lineKey="labor" onChange={onChange} />
          </div>
        </section>

        <section className="card stack">
          <h2>Prices (çmimet)</h2>
          <p className="hint">Enter VAT-inclusive amounts. The customer offer hides TVSH until you turn it on. (Çmimet me TVSH. Klienti nuk e sheh TVSH derisa ta ndezësh.)</p>
          {offer.lines.map((line, index) => (
            <div key={line.id} className="line">
              <Field label="Item (artikulli)">
                <input data-testid={index === 0 ? "unit-name" : undefined} value={line.name} onChange={(event) => setLine(line.id, { name: event.target.value })} />
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
                <IncomeAmount value={numLine(line)} />
                <button type="button" className="btn danger" onClick={() => onChange({ ...offer, lines: offer.lines.filter((item) => item.id !== line.id) })}>Remove</button>
              </div>
              <ShowCustomer offer={offer} lineKey={line.id} onChange={onChange} />
            </div>
          ))}
          <button type="button" className="btn" onClick={() => onChange({ ...offer, lines: [...offer.lines, { id: crypto.randomUUID(), name: "", qty: "1", price: "" }] })}>
            Add line (shto rresht)
          </button>
        </section>

        <section className="card stack">
          <h2>Garanci Shtesë dhe Abonim Vjetor</h2>
          <h3>Garanci Shtesë</h3>
          <ShowCustomer offer={offer} lineKey="warranty" onChange={onChange} />
          <p className="hint">Çdo vit shtesë kushton {lek(Number(settings.extraWarrantyYear || "25000"))} dhe përfshin abonimin vjetor të atij viti falas.</p>
          <div className="numstep">
            <button type="button" className="btn" aria-label="Pakëso vitet e garancisë" onClick={() => onChange({ ...offer, extraWarrantyYears: Math.max(0, years - 1), pricingV2: true })}>−</button>
            <input
              data-testid="warranty-years"
              inputMode="numeric"
              aria-label="Vite garanci shtesë"
              value={String(years)}
              onChange={(event) => onChange({ ...offer, extraWarrantyYears: Math.max(0, Math.floor(Number(event.target.value) || 0)), pricingV2: true })}
            />
            <button type="button" className="btn" aria-label="Shto vit garancie" onClick={() => onChange({ ...offer, extraWarrantyYears: years + 1, pricingV2: true })}>+</button>
          </div>
          <h3>Abonim Vjetor</h3>
          <ShowCustomer offer={offer} lineKey="membership" onChange={onChange} />
          <p className="hint">Çdo instalim përfshin 1 vit abonim vjetor falas (0 Lek): 1 larje dhe 1 mirëmbajtje. Vitet e mbuluara nga garancia shtesë nuk paguhen. Çdo vit me pagesë është {lek(Number(settings.membershipYear || "6000"))}.</p>
          <Field label="Vite abonimi (1–10)">
            <select
              data-testid="membership-years"
              value={String(offer.membershipYears ?? 1)}
              onChange={(event) => onChange({ ...offer, membershipYears: Number(event.target.value), pricingV2: true })}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </Field>
        </section>

        <section className="card stack">
          <h2>Vinç/Lift</h2>
          <ShowCustomer offer={offer} lineKey="lift" onChange={onChange} />
          <Toggle label="Duhet vinç / lift" checked={offer.liftNeeded === true} onChange={(liftNeeded) => onChange({ ...offer, liftNeeded, pricingV2: true })} />
          {offer.liftNeeded ? (
            <Field label="Orë (10,000 Lek për orë)">
              <input data-testid="lift-hours" inputMode="decimal" value={offer.liftHours ?? "1"} onChange={(event) => onChange({ ...offer, liftHours: event.target.value, pricingV2: true })} />
            </Field>
          ) : null}
        </section>

        <section className="card stack">
          <h2>Muri</h2>
          <ShowCustomer offer={offer} lineKey="wall" onChange={onChange} />
          <Field label="Lloji i murit">
            <select
              data-testid="wall-type"
              value={offer.wallType ?? "tulle"}
              onChange={(event) => onChange({ ...offer, wallType: event.target.value as WallType, pricingV2: true })}
            >
              <option value="tulle">Tullë</option>
              <option value="gur">Mur guri</option>
              <option value="beton">Beton</option>
            </select>
          </Field>
          <p className="hint">Tullë pa shtesë. Mur guri dhe Beton: {lek(Number(settings.hardWallHole || "13000"))} për gropë.</p>
          {offer.wallType === "gur" || offer.wallType === "beton" ? (
            <Field label="Numri i gropëve">
              <input data-testid="holes" inputMode="numeric" value={offer.holes ?? "1"} onChange={(event) => onChange({ ...offer, holes: event.target.value, pricingV2: true })} />
            </Field>
          ) : null}
        </section>

        <section className="card stack">
          <h2>Tub Shtesë</h2>
          <ShowCustomer offer={offer} lineKey="pipe" onChange={onChange} />
          <p className="hint">3 m të përfshira. Çmimi për metër vjen nga Cilësimet ({settings.extraRate ? `${lek(Number(settings.extraRate))}/m` : "pa çmim"}).</p>
          {Number(settings.extraRate) <= 0 ? <p className="warn">Duhet një vlerë për metër te Cilësimet (Extra pipe).</p> : null}
          <Field label="Metra shtesë">
            <input data-testid="extra-pipe" inputMode="decimal" value={offer.extraPipeM ?? "0"} onChange={(event) => onChange({ ...offer, extraPipeM: event.target.value, pricingV2: true })} />
          </Field>
        </section>

        <section className="card stack">
          <h2>Kati</h2>
          <ShowCustomer offer={offer} lineKey="floor" onChange={onChange} />
          <Field label="Numri i katit (0 ose 1 = përdhese)">
            <input data-testid="floor" inputMode="numeric" value={offer.floor ?? "0"} onChange={(event) => onChange({ ...offer, floor: event.target.value, pricingV2: true })} />
          </Field>
          <div className="seg">
            <button type="button" className={offer.elevator !== false ? "on" : ""} onClick={() => onChange({ ...offer, elevator: true, pricingV2: true })}>Me ashensor</button>
            <button type="button" className={offer.elevator === false ? "on" : ""} onClick={() => onChange({ ...offer, elevator: false, pricingV2: true })}>Pa ashensor</button>
          </div>
          <p className="hint">Pa ashensor: {lek(Number(settings.floorSurcharge || "1000"))} për çdo kat mbi tokë. Çmim i përkohshëm, ndryshohet te Cilësimet.</p>
        </section>
      </div>

      <section className="card stack">
        <div className="no-print stack">
          <Toggle label="Shfaq ndarjen e TVSH në ofertë" checked={offer.showVat} onChange={(showVat) => onChange({ ...offer, showVat })} />
          <ShowCustomer offer={offer} lineKey="vat" onChange={onChange} />
          <h2>Brenda (të gjitha rreshtat)</h2>
          <p className="hint">Këto rreshta mbeten në totalin edhe kur nuk shfaqen te klienti.</p>
          {quote.lines.map((line) => (
            <div key={line.key} className="kv" data-testid={`internal-${line.key}`}>
              <span>{line.label}</span>
              <IncomeAmount value={shownAmount(line.gross, offer.showVat)} />
            </div>
          ))}
        </div>
        <p className="hint no-print">Si e sheh klienti</p>
        <article className="print-sheet" data-testid="offer-sheet">
          <img className="offer-logo" src={logo} alt="L.C.P Clima" />
          <h1>{COMPANY.brand}</h1>
          <p>{phone || "Set the company phone in Settings. (Vendos telefonin te Cilësimet.)"}</p>
          <h2>OFERTË</h2>
          <p><b>Klienti:</b> {offer.customerName || "—"}</p>
          {offer.phone ? <p><b>Telefoni:</b> {offer.phone}</p> : null}
          {offer.address ? <p><b>Adresa:</b> {offer.address}</p> : null}
          {offer.size ? <p><b>Madhësia:</b> {offer.size}</p> : null}
          {visible.map((line) => (
            <div key={line.key} className="kv" data-testid={`customer-${line.key}`}>
              <span>{line.label}{line.detail ? <small className="hint"> {line.detail}</small> : null}{line.needsValue ? <small className="warn"> Duhet një vlerë.</small> : null}</span>
              <IncomeAmount value={shownAmount(line.gross, offer.showVat)} />
            </div>
          ))}
          {showVatBreakdown ? (
            <>
              <div className="kv" data-testid="customer-vat"><span>Nëntotali pa TVSH</span><IncomeAmount value={quote.net} /></div>
              <div className="kv" data-testid="customer-vat-line"><span>TVSH 20%</span><b className="money neg">{lek(quote.vat)}</b></div>
              <div className="kv total-line" data-testid="offer-total" data-gross={String(Math.round(quote.gross))}><span>Totali me TVSH</span><IncomeAmount value={quote.gross} /></div>
            </>
          ) : offer.showVat ? (
            <div className="kv total-line" data-testid="offer-total" data-gross={String(Math.round(quote.gross))}><span>Totali me TVSH</span><IncomeAmount value={quote.gross} /></div>
          ) : (
            <div className="kv total-line" data-testid="offer-total" data-gross={String(Math.round(quote.gross))}><span>Çmimi me TVSH</span><IncomeAmount value={quote.gross} /></div>
          )}
          <div className="sign"><strong>{COMPANY.brand}</strong>{phone ? <div>{phone}</div> : null}</div>
        </article>
        <div className="actions no-print">
          <button type="button" className="btn" onClick={() => setOpenSheet(true)}>Printo / Shpërndaj ofertën</button>
          <button type="button" className="btn danger" onClick={() => setAskDelete(true)}>Fshi ofertën</button>
          {askDelete ? (
            <div className="callout">
              <p>Të fshihet kjo ofertë?</p>
              <button type="button" className="btn danger" onClick={onDelete}>Po</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ShowCustomer({ offer, lineKey, onChange }: { offer: Offer; lineKey: string; onChange: (offer: Offer) => void }) {
  const shown = showToCustomer(offer, lineKey);
  return (
    <label className="check-row">
      <input
        type="checkbox"
        data-testid={`show-${lineKey}`}
        checked={shown}
        onChange={(event) => onChange(setCustomerVisible(offer, lineKey, event.target.checked))}
      />
      <span>Shfaq te klienti</span>
    </label>
  );
}

function numLine(line: OfferLine): number {
  const qty = Number.parseFloat((line.qty || "").replace(",", ".")) || 0;
  const price = Number.parseFloat((line.price || "").replace(",", ".")) || 0;
  return qty * price;
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
