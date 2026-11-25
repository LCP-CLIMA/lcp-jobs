import { useEffect, useState } from "react";
import { saveJob } from "../lib/db";
import { lek } from "../lib/format";
import { emptyMoney, lineMargin, moneyTotals, SIZE_LABOR, SIZE_PACKAGE, suggestSell } from "../lib/simple";
import { SERVICE_STATUSES } from "../lib/status";
import type { BookItem, JobMoney, JobRecord, JobStatus } from "../lib/types";
import { Field, Money } from "../ui";

function MoneyPair({
  sq,
  en,
  buy,
  sell,
  onBuy,
  onSell,
  buyTest,
  sellTest,
  vat,
}: {
  sq: string;
  en: string;
  buy: string;
  sell: string;
  onBuy: (value: string) => void;
  onSell: (value: string) => void;
  buyTest?: string;
  sellTest?: string;
  vat: boolean;
}) {
  const margin = lineMargin(Number(buy) || 0, Number(sell) || 0, vat);
  return (
    <div className="line">
      <strong>{sq} <small className="hint">{en}</small></strong>
      <div className="row">
        <Field label="Blerje">
          <span className="hint">Buy, Lek</span>
          <input data-testid={buyTest} inputMode="decimal" value={buy} onChange={(event) => onBuy(event.target.value)} />
        </Field>
        <Field label="Shitje">
          <span className="hint">Sell, Lek</span>
          <input data-testid={sellTest} inputMode="decimal" value={sell} onChange={(event) => onSell(event.target.value)} />
        </Field>
      </div>
      <details>
        <summary>Detaje <small className="hint">qty × price, optional</small></summary>
        <Detail onApply={(amount) => onBuy(amount)} />
      </details>
      {margin != null ? <p className="hint">Marzhi i rreshtit {margin.toFixed(1)}% · line margin. Klienti sheh vetëm shitjen.</p> : null}
    </div>
  );
}

function Detail({ onApply }: { onApply: (amount: string) => void }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  return (
    <div className="row">
      <Field label="Sasia">
        <span className="hint">Qty</span>
        <input inputMode="decimal" value={qty} onChange={(event) => setQty(event.target.value)} />
      </Field>
      <Field label="Çmimi">
        <span className="hint">Price</span>
        <input inputMode="decimal" value={price} onChange={(event) => {
          const next = event.target.value;
          setPrice(next);
          const q = Number(qty);
          const p = Number(next);
          if (q > 0 && p > 0) onApply(String(Math.round(q * p)));
        }} />
      </Field>
    </div>
  );
}

export function JobForm({
  initial,
  book,
  draft,
  onSaved,
  onDirty,
  onDelete,
}: {
  initial: JobRecord;
  book: BookItem[];
  draft: boolean;
  onSaved: (job: JobRecord) => void;
  onDirty: (dirty: boolean) => void;
  onDelete: () => void;
}) {
  const [job, setJob] = useState(initial);
  const [savedMark, setSavedMark] = useState("");
  const money = { ...emptyMoney(), ...job.money, tiers: job.money?.tiers?.length ? job.money.tiers : emptyMoney().tiers };
  const totals = moneyTotals(money);
  const dirty = JSON.stringify(job) !== JSON.stringify(initial) && savedMark !== JSON.stringify(job);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  function setMoney(patch: Partial<JobMoney>) {
    setJob({ ...job, money: { ...money, ...patch } });
    setSavedMark("");
  }

  function addBookItem(item: BookItem) {
    const buy = String((Number(fieldBuy(money, item.group)) || 0) + (Number(item.buy) || 0) || "");
    const sell = String((Number(fieldSell(money, item.group)) || 0) + (Number(item.sell) || 0) || "");
    const patch: Partial<JobMoney> = {};
    if (item.group === "unit") {
      patch.unitBuy = item.buy;
      patch.unitSell = item.sell;
      if (item.size) patch.size = item.size;
    } else if (item.group === "pipes") {
      patch.matPipes = buy;
      patch.matPipesSell = sell;
    } else if (item.group === "cable") {
      patch.matCable = buy;
      patch.matCableSell = sell;
    } else if (item.group === "bracket") {
      patch.matBracket = buy;
      patch.matBracketSell = sell;
    } else if (item.group === "drain") {
      patch.matDrain = buy;
      patch.matDrainSell = sell;
    } else if (item.group === "travel") {
      patch.extraTravel = buy;
      patch.extraTravelSell = sell;
    } else {
      patch.matOther = buy;
      patch.matOtherSell = sell;
    }
    setMoney(patch);
  }

  function applySize(size: JobMoney["size"]) {
    const wage = size ? String(SIZE_LABOR[size]) : money.extraHelper;
    setMoney({ size, extraHelper: wage });
  }

  function applyTarget() {
    const suggested = suggestSell(totals.cost, Number(money.targetMargin));
    if (suggested == null) return;
    const other = totals.sell - (Number(money.unitSell) || 0);
    setMoney({ unitSell: String(Math.round(suggested - other)) });
  }

  async function accept() {
    const next = { ...job, money, status: "scheduled" as const, updatedAt: new Date().toISOString() };
    await saveJob(next);
    setJob(next);
    setSavedMark(JSON.stringify(next));
    onSaved(next);
    onDirty(false);
  }

  async function save() {
    const next = { ...job, money, updatedAt: new Date().toISOString() };
    await saveJob(next);
    setJob(next);
    setSavedMark(JSON.stringify(next));
    onSaved(next);
    onDirty(false);
  }

  const packageHint = money.size ? SIZE_PACKAGE[money.size] : 0;

  return (
    <div className="stack job-pad" data-testid="job-form">
      <section className="card stack">
        <Field label="Klienti">
          <span className="hint">Customer</span>
          <input data-testid="customer-name" value={job.customerName} onChange={(event) => setJob({ ...job, customerName: event.target.value })} />
        </Field>
        <Field label="Telefoni">
          <span className="hint">Phone</span>
          <input type="tel" value={job.phone} onChange={(event) => setJob({ ...job, phone: event.target.value })} />
        </Field>
        <Field label="Adresa">
          <span className="hint">Address</span>
          <textarea value={job.address} onChange={(event) => setJob({ ...job, address: event.target.value })} />
        </Field>
        <Field label="Data">
          <span className="hint">Date, DD/MM/YYYY</span>
          <input type="date" value={job.date} onChange={(event) => setJob({ ...job, date: event.target.value })} />
        </Field>
        <Field label="Lloji i punës">
          <span className="hint">Job type</span>
          <select value={job.kind} onChange={(event) => setJob({ ...job, kind: event.target.value as JobRecord["kind"] } as JobRecord)}>
            <option value="install">Montim · Installation</option>
            <option value="service">Servis · Service</option>
          </select>
        </Field>
      </section>

      <section className="card stack">
        <h2>Njësia <small className="hint">Unit</small></h2>
        <Field label="Marka">
          <span className="hint">Brand</span>
          <input value={job.kind === "install" ? job.brand : ""} onChange={(event) => setJob({ ...job, brand: event.target.value } as JobRecord)} />
        </Field>
        <Field label="Modeli">
          <span className="hint">Model</span>
          <input value={job.kind === "install" ? job.model : ""} onChange={(event) => setJob({ ...job, model: event.target.value } as JobRecord)} />
        </Field>
        <Field label="Madhësia BTU">
          <span className="hint">One size for package and labour</span>
          <select data-testid="job-size" value={money.size} onChange={(event) => applySize(event.target.value as JobMoney["size"])}>
            <option value="">—</option>
            <option value="9k">9k</option>
            <option value="12k">12k</option>
            <option value="18k">18k</option>
            <option value="24k">24k</option>
          </select>
        </Field>
        {packageHint ? <p className="hint">Paketa e kësaj madhësie {lek(packageHint)}. Nuk vendoset vetë si çmim shitjeje. Package hint only, not the selling price.</p> : null}
        <MoneyPair sq="Njësia" en="Unit" buy={money.unitBuy} sell={money.unitSell} vat={money.purchasesVat} buyTest="unit-buy" sellTest="selling-price" onBuy={(unitBuy) => setMoney({ unitBuy })} onSell={(unitSell) => setMoney({ unitSell })} />
        <label className="field">
          <span>Marzh i synuar %</span>
          <span className="hint">Target margin, optional. You can override the price.</span>
          <input data-testid="target-margin" inputMode="decimal" value={money.targetMargin} onChange={(event) => setMoney({ targetMargin: event.target.value })} />
        </label>
        <button type="button" className="btn" onClick={applyTarget}>Sugjero çmimin <small>Suggest price</small></button>
      </section>

      <section className="card stack">
        <h2>Materialet <small className="hint">Materials, lump sums</small></h2>
        <BookPicker book={book} onAdd={addBookItem} />
        <MoneyPair sq="Tuba + izolim" en="Pipes and insulation" buy={money.matPipes} sell={money.matPipesSell} vat={money.purchasesVat} buyTest="materials" onBuy={(matPipes) => setMoney({ matPipes })} onSell={(matPipesSell) => setMoney({ matPipesSell })} />
        <MoneyPair sq="Kabllo" en="Cable" buy={money.matCable} sell={money.matCableSell} vat={money.purchasesVat} onBuy={(matCable) => setMoney({ matCable })} onSell={(matCableSell) => setMoney({ matCableSell })} />
        <MoneyPair sq="Mbajtëse" en="Bracket" buy={money.matBracket} sell={money.matBracketSell} vat={money.purchasesVat} onBuy={(matBracket) => setMoney({ matBracket })} onSell={(matBracketSell) => setMoney({ matBracketSell })} />
        <MoneyPair sq="Drenazh" en="Drain" buy={money.matDrain} sell={money.matDrainSell} vat={money.purchasesVat} onBuy={(matDrain) => setMoney({ matDrain })} onSell={(matDrainSell) => setMoney({ matDrainSell })} />
        <MoneyPair sq="Materiale të tjera" en="Other materials" buy={money.matOther} sell={money.matOtherSell} vat={money.purchasesVat} onBuy={(matOther) => setMoney({ matOther })} onSell={(matOtherSell) => setMoney({ matOtherSell })} />
      </section>

      <section className="card stack">
        <h2>Shpenzime të tjera <small className="hint">Other expenses</small></h2>
        <MoneyPair sq="Karburant / rrugë" en="Fuel / travel" buy={money.extraTravel} sell={money.extraTravelSell} vat={money.purchasesVat} buyTest="extras" onBuy={(extraTravel) => setMoney({ extraTravel })} onSell={(extraTravelSell) => setMoney({ extraTravelSell })} />
        <MoneyPair sq="Të tjera" en="Other" buy={money.extraOther} sell={money.extraOtherSell} vat={money.purchasesVat} onBuy={(extraOther) => setMoney({ extraOther })} onSell={(extraOtherSell) => setMoney({ extraOtherSell })} />
        <label className="check-row">
          <input type="checkbox" checked={money.vacuumOn} onChange={(event) => setMoney({ vacuumOn: event.target.checked })} />
          <span>Test vakumi / N₂ <small className="hint">Vacuum test, off until you count it</small></span>
        </label>
        {money.vacuumOn ? (
          <Field label="Kosto vakumi, Lek">
            <span className="hint">Vacuum cost</span>
            <input inputMode="decimal" value={money.vacuumCost} onChange={(event) => setMoney({ vacuumCost: event.target.value })} />
          </Field>
        ) : null}
        <label className="check-row">
          <input data-testid="pay-wage" type="checkbox" checked={money.payWage} onChange={(event) => setMoney({ payWage: event.target.checked })} />
          <span>Të paguaj veten nga kjo punë? <small className="hint">Pay myself a wage from this job?</small></span>
        </label>
        {money.payWage ? (
          <Field label="Paga ime, Lek">
            <span className="hint">My wage. {money.size ? `Suggested ${lek(SIZE_LABOR[money.size])}` : ""}</span>
            <input inputMode="decimal" value={money.extraHelper} onChange={(event) => setMoney({ extraHelper: event.target.value })} />
          </Field>
        ) : null}
        <label className="check-row">
          <input type="checkbox" checked={money.purchasesVat} onChange={(event) => setMoney({ purchasesVat: event.target.checked })} />
          <span>Të gjitha blerjet kanë faturë TVSH <small className="hint">All purchases have a VAT invoice</small></span>
        </label>
      </section>

      {job.status === "quote" ? (
        <section className="card stack">
          <h2>Mirë / më mirë / më së miri <small className="hint">Good, better, best. Offer only.</small></h2>
          {money.tiers.map((tier, index) => (
            <div key={index} className="row">
              <Field label={index === 0 ? "Haier" : index === 1 ? "Fujitsu" : "Opsioni 3"}>
                <span className="hint">Name</span>
                <input value={tier.name} onChange={(event) => {
                  const tiers = money.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item);
                  setMoney({ tiers });
                }} />
              </Field>
              <Field label="Shitje, Lek">
                <span className="hint">Sell</span>
                <input inputMode="decimal" value={tier.sell} onChange={(event) => {
                  const tiers = money.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, sell: event.target.value } : item);
                  setMoney({ tiers });
                }} />
              </Field>
            </div>
          ))}
          <article className="print-sheet">
            <h2>OFERTË</h2>
            <p><b>Klienti:</b> {job.customerName || "—"}</p>
            {money.size ? <p><b>Madhësia:</b> {money.size}</p> : null}
            {totals.sell > 0 ? <div className="kv total-line"><span>Çmimi me TVSH</span><b>{lek(totals.sell)}</b></div> : null}
            {money.tiers.filter((tier) => tier.name || tier.sell).map((tier) => (
              <div key={tier.name + tier.sell} className="kv"><span>{tier.name || "Opsion"}</span><b>{lek(Number(tier.sell) || 0)}</b></div>
            ))}
          </article>
        </section>
      ) : null}

      <section className="card stack">
        <h2>Statusi <small className="hint">Status</small></h2>
        <div className="chips status-filters">
          {SERVICE_STATUSES.map((status) => (
            <button key={status.id} type="button" className={`chip${job.status === status.id ? " on" : ""}`} onClick={() => setJob({ ...job, status: status.id as JobStatus })}>
              {status.sq}<small>{status.en}</small>
            </button>
          ))}
        </div>
        {job.status === "quote" ? (
          <>
            <p className="hint">Kjo është oferta. Pranoje dhe e njëjta punë kalon te Servis & montim, pa i shkruar fushat përsëri.</p>
            <button type="button" className="btn gold" data-testid="accept-job" onClick={() => void accept()}>Pranoje · Accept</button>
          </>
        ) : null}
      </section>

      <div className="actions">
        <button type="button" className="btn gold" data-testid="save-job" onClick={() => void save()}>{draft || dirty ? "Ruaj punën · Save" : "E ruajtur · Saved"}</button>
        <button type="button" className="btn danger" onClick={onDelete}>Fshi · Delete</button>
      </div>

      <aside className="sticky-profit" data-testid="job-totals">
        {totals.hasSell ? (
          <>
            <div className="kv"><span>Kostoja <small>Cost</small></span><b data-testid="total-cost">{lek(totals.cost)}</b></div>
            <div className="kv"><span>Shitja me TVSH <small>Selling price incl. VAT</small></span><b data-testid="total-sell">{lek(totals.sell)}</b></div>
            <div className="kv"><span>TVSH për shtetin <small>VAT to pay</small></span><b>{lek(totals.vatToPay)}</b></div>
            <div className="kv"><span>FITIMI <small>Profit</small></span><span data-testid="profit-amount"><Money value={totals.profit} /></span></div>
            <div className="kv"><span>Marzhi <small>Margin</small></span><b data-testid="margin">{totals.margin.toFixed(1)}%</b></div>
            <p className="hint">{lek(totals.beforeVat)} para TVSH-së së mbetur. TVSH për shtetin është {lek(totals.vatToPay)}, prandaj fitimi nuk është thjesht shitja minus kostoja.</p>
          </>
        ) : (
          <p data-testid="need-sell">Shkruaj çmimin e shitjes. <small className="hint">Enter the selling price. No loss is shown yet.</small></p>
        )}
      </aside>
    </div>
  );
}

function fieldBuy(money: JobMoney, group: BookItem["group"]): string {
  if (group === "unit") return money.unitBuy;
  if (group === "pipes") return money.matPipes;
  if (group === "cable") return money.matCable;
  if (group === "bracket") return money.matBracket;
  if (group === "drain") return money.matDrain;
  if (group === "travel") return money.extraTravel;
  return money.matOther;
}

function fieldSell(money: JobMoney, group: BookItem["group"]): string {
  if (group === "unit") return money.unitSell;
  if (group === "pipes") return money.matPipesSell;
  if (group === "cable") return money.matCableSell;
  if (group === "bracket") return money.matBracketSell;
  if (group === "drain") return money.matDrainSell;
  if (group === "travel") return money.extraTravelSell;
  return money.matOtherSell;
}

function BookPicker({ book, onAdd }: { book: BookItem[]; onAdd: (item: BookItem) => void }) {
  const [id, setId] = useState("");
  const item = book.find((entry) => entry.id === id);
  return (
    <div className="row">
      <Field label="Lista e çmimeve">
        <span className="hint">Price book. Tap add, then edit.</span>
        <select value={id} onChange={(event) => setId(event.target.value)}>
          <option value="">—</option>
          {book.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </Field>
      <button type="button" className="btn" disabled={!item} onClick={() => item && onAdd(item)}>Shto</button>
    </div>
  );
}
