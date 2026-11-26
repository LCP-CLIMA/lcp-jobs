import { useEffect, useMemo, useState } from "react";
import { saveJob } from "../lib/db";
import { lek, num } from "../lib/format";
import { emptyMoney, lineMargin, moneyTotals, SIZE_LABOR, SIZE_PACKAGE, suggestSell } from "../lib/simple";
import { resizeSingle, systemsOf } from "../lib/split";
import { SERVICE_STATUSES } from "../lib/status";
import type { BookItem, JobMoney, JobRecord, JobStatus, Settings } from "../lib/types";
import { SplitPanel } from "./SplitPanel";
import { DateField, Field, Money } from "../ui";

function MoneyPair({
  sq,
  buy,
  sell,
  onBuy,
  onSell,
  buyTest,
  sellTest,
  vat,
}: {
  sq: string;
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
      <strong>{sq}</strong>
      <div className="row">
        <Field label="Blerje, Lek">
          <input data-testid={buyTest} inputMode="decimal" value={buy} onChange={(event) => onBuy(event.target.value)} />
        </Field>
        <Field label="Shitje, Lek">
          <input data-testid={sellTest} inputMode="decimal" value={sell} onChange={(event) => onSell(event.target.value)} />
        </Field>
      </div>
      <details>
        <summary>Detaje</summary>
        <Detail onApply={(amount) => onBuy(amount)} />
      </details>
      {margin != null ? <p className="hint">Marzhi i rreshtit {margin.toFixed(1)}%. Klienti sheh vetëm shitjen.</p> : null}
    </div>
  );
}

function Detail({ onApply }: { onApply: (amount: string) => void }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  return (
    <div className="row">
      <Field label="Sasia">
        <input inputMode="decimal" value={qty} onChange={(event) => setQty(event.target.value)} />
      </Field>
      <Field label="Çmimi">
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
  settings,
  draft,
  onSaved,
  onDirty,
  onDelete,
  onPrinted,
}: {
  initial: JobRecord;
  book: BookItem[];
  settings: Settings;
  draft: boolean;
  onSaved: (job: JobRecord) => void;
  onDirty: (dirty: boolean) => void;
  onDelete: () => void;
  onPrinted: (job: JobRecord) => void;
}) {
  const [job, setJob] = useState(initial);
  const [savedMark, setSavedMark] = useState("");
  const [priceWarning, setPriceWarning] = useState(false);
  const money = useMemo(
    () => ({ ...emptyMoney(), ...job.money, tiers: job.money?.tiers?.length ? job.money.tiers : emptyMoney().tiers }),
    [job.money],
  );
  const totals = useMemo(() => moneyTotals(money), [money]);
  const systems = money.systems?.length ? money.systems : systemsOf(money, settings, job.id);
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
    const nextSystems = systems.map((system, index) => index === 0 && system.kind === "single" ? resizeSingle(system, size || "12k", settings) : system);
    setMoney({ size, extraHelper: wage, systems: nextSystems });
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

  async function persist(): Promise<JobRecord> {
    const next = { ...job, money, updatedAt: new Date().toISOString() };
    await saveJob(next);
    setJob(next);
    setSavedMark(JSON.stringify(next));
    onSaved(next);
    onDirty(false);
    return next;
  }

  async function save() {
    await persist();
  }

  async function printOffer() {
    if (!totals.hasSell) {
      setPriceWarning(true);
      return;
    }
    setPriceWarning(false);
    const next = await persist();
    onPrinted(next);
  }

  const packageHint = money.size ? SIZE_PACKAGE[money.size] : 0;

  return (
    <div className="stack job-pad" data-testid="job-form">
      <section className="card stack">
        <Field label="Klienti">
          <input data-testid="customer-name" value={job.customerName} onChange={(event) => setJob({ ...job, customerName: event.target.value })} />
        </Field>
        <Field label="Telefoni">
          <input type="tel" value={job.phone} onChange={(event) => setJob({ ...job, phone: event.target.value })} />
        </Field>
        <Field label="Adresa">
          <textarea value={job.address} onChange={(event) => setJob({ ...job, address: event.target.value })} />
        </Field>
        <Field label="Data">
          <DateField testId="job-date" value={job.date} onChange={(date) => setJob({ ...job, date })} />
        </Field>
        <Field label="Lloji i punës">
          <select value={job.kind} onChange={(event) => setJob({ ...job, kind: event.target.value as JobRecord["kind"] } as JobRecord)}>
            <option value="install">Montim</option>
            <option value="service">Servis</option>
          </select>
        </Field>
      </section>

      {job.kind === "install" ? (
        <SplitPanel
          systems={systems}
          settings={settings}
          onChange={(next) => {
            const single = next.length === 1 && next[0].kind === "single" ? next[0].outdoors[0]?.indoors[0]?.size : "";
            const size = single === "9k" || single === "12k" || single === "18k" || single === "24k" ? single : "";
            setMoney({ systems: next, size });
          }}
        />
      ) : null}

      <section className="card stack">
        <h2>Njësia</h2>
        <Field label="Marka">
          <input value={job.kind === "install" ? job.brand : ""} onChange={(event) => setJob({ ...job, brand: event.target.value } as JobRecord)} />
        </Field>
        <Field label="Modeli">
          <input value={job.kind === "install" ? job.model : ""} onChange={(event) => setJob({ ...job, model: event.target.value } as JobRecord)} />
        </Field>
        {systems[0]?.kind === "multi" ? null : (
          <Field label="Madhësia BTU">
            <select data-testid="job-size" value={money.size} onChange={(event) => applySize(event.target.value as JobMoney["size"])}>
              <option value="">—</option>
              <option value="9k">9k</option>
              <option value="12k">12k</option>
              <option value="18k">18k</option>
              <option value="24k">24k</option>
            </select>
          </Field>
        )}
        {packageHint ? <p className="hint">Paketa e kësaj madhësie {lek(packageHint)}. Nuk vendoset vetë si çmim shitjeje.</p> : null}
        <MoneyPair sq="Njësia" buy={money.unitBuy} sell={money.unitSell} vat={money.purchasesVat} buyTest="unit-buy" sellTest="selling-price" onBuy={(unitBuy) => setMoney({ unitBuy })} onSell={(unitSell) => { setPriceWarning(false); setMoney({ unitSell }); }} />
        <p className="hint">Ky është çmimi i njësisë dhe i punës. Materialet e Detajeve i shtohen, nuk janë brenda këtij çmimi.</p>
        <label className="field">
          <span>Marzh i synuar %</span>
          <input data-testid="target-margin" inputMode="decimal" value={money.targetMargin} onChange={(event) => setMoney({ targetMargin: event.target.value })} />
        </label>
        <button type="button" className="btn" onClick={applyTarget}>Sugjero çmimin</button>
      </section>

      <section className="card stack">
        <h2>Materialet</h2>
        <p className="hint">Vetëm ato që nuk janë te Detaje.</p>
        <BookPicker book={book} onAdd={addBookItem} />
        <MoneyPair sq="Tuba + izolim" buy={money.matPipes} sell={money.matPipesSell} vat={money.purchasesVat} buyTest="materials" onBuy={(matPipes) => setMoney({ matPipes })} onSell={(matPipesSell) => setMoney({ matPipesSell })} />
        <MoneyPair sq="Kabllo" buy={money.matCable} sell={money.matCableSell} vat={money.purchasesVat} onBuy={(matCable) => setMoney({ matCable })} onSell={(matCableSell) => setMoney({ matCableSell })} />
        <MoneyPair sq="Mbajtëse" buy={money.matBracket} sell={money.matBracketSell} vat={money.purchasesVat} onBuy={(matBracket) => setMoney({ matBracket })} onSell={(matBracketSell) => setMoney({ matBracketSell })} />
        <MoneyPair sq="Drenazh" buy={money.matDrain} sell={money.matDrainSell} vat={money.purchasesVat} onBuy={(matDrain) => setMoney({ matDrain })} onSell={(matDrainSell) => setMoney({ matDrainSell })} />
        <MoneyPair sq="Materiale të tjera" buy={money.matOther} sell={money.matOtherSell} vat={money.purchasesVat} onBuy={(matOther) => setMoney({ matOther })} onSell={(matOtherSell) => setMoney({ matOtherSell })} />
      </section>

      <section className="card stack">
        <h2>Shpenzime të tjera</h2>
        <MoneyPair sq="Karburant / rrugë" buy={money.extraTravel} sell={money.extraTravelSell} vat={money.purchasesVat} buyTest="extras" onBuy={(extraTravel) => setMoney({ extraTravel })} onSell={(extraTravelSell) => setMoney({ extraTravelSell })} />
        <MoneyPair sq="Të tjera" buy={money.extraOther} sell={money.extraOtherSell} vat={money.purchasesVat} onBuy={(extraOther) => setMoney({ extraOther })} onSell={(extraOtherSell) => setMoney({ extraOtherSell })} />
        <label className="check-row">
          <input type="checkbox" checked={money.vacuumOn} onChange={(event) => setMoney({ vacuumOn: event.target.checked })} />
          <span>Test vakumi / N₂</span>
        </label>
        {money.vacuumOn ? (
          <Field label="Kosto vakumi, Lek">
            <input inputMode="decimal" value={money.vacuumCost} onChange={(event) => setMoney({ vacuumCost: event.target.value })} />
          </Field>
        ) : null}
        <label className="check-row">
          <input data-testid="pay-wage" type="checkbox" checked={money.payWage} onChange={(event) => setMoney({ payWage: event.target.checked })} />
          <span>Të paguaj veten nga kjo punë?</span>
        </label>
        {money.payWage ? (
          <Field label="Paga ime, Lek">
            {money.size ? <span className="hint">Sugjerim {lek(SIZE_LABOR[money.size])}</span> : null}
            <input inputMode="decimal" value={money.extraHelper} onChange={(event) => setMoney({ extraHelper: event.target.value })} />
          </Field>
        ) : null}
        <label className="check-row">
          <input type="checkbox" checked={money.purchasesVat} onChange={(event) => setMoney({ purchasesVat: event.target.checked })} />
          <span>Të gjitha blerjet kanë faturë TVSH</span>
        </label>
      </section>

      {job.status === "quote" ? (
        <section className="card stack">
          <h2>Mirë / më mirë / më së miri</h2>
          {money.tiers.map((tier, index) => (
            <div key={index} className="row">
              <Field label={index === 0 ? "Haier" : index === 1 ? "Fujitsu" : "Opsioni 3"}>
                <span className="hint">Emri</span>
                <input value={tier.name} onChange={(event) => {
                  const tiers = money.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item);
                  setMoney({ tiers });
                }} />
              </Field>
              <Field label="Shitje, Lek">
                <span className="hint">Shitja</span>
                <input inputMode="decimal" value={tier.sell} onChange={(event) => {
                  const tiers = money.tiers.map((item, itemIndex) => itemIndex === index ? { ...item, sell: event.target.value } : item);
                  setMoney({ tiers });
                }} />
              </Field>
          </div>
        ))}
        </section>
      ) : null}

      <section className="card stack">
        <h2>Garanci dhe abonim</h2>
        <Field label="Garanci shtesë, vite">
          <input inputMode="numeric" value={money.warrantyYears} onChange={(event) => setMoney({ warrantyYears: event.target.value })} />
        </Field>
        <Field label="Abonim vjetor, vite">
          <input inputMode="numeric" value={money.membershipYears} onChange={(event) => setMoney({ membershipYears: event.target.value })} />
        </Field>
        <p className="hint">Viti i parë i abonimit është falas. Çdo vit garancie shtesë kushton {lek(num(settings.extraWarrantyYear || "25000"))} dhe e përfshin abonimin.</p>
        <label className="check-row">
          <input type="checkbox" checked={job.showVatOnQuote === true} onChange={(event) => setJob({ ...job, showVatOnQuote: event.target.checked })} />
          <span>Shfaq ndarjen e TVSH në ofertë</span>
        </label>
      </section>

      <section className="card stack">
        <h2>Statusi</h2>
        <div className="chips status-filters">
          {SERVICE_STATUSES.map((status) => (
            <button key={status.id} type="button" data-testid={`status-${status.id}`} className={`chip${job.status === status.id ? " on" : ""}`} onClick={() => setJob({ ...job, status: status.id as JobStatus })}>
              {status.sq}
            </button>
          ))}
        </div>
        {job.status === "quote" ? (
          <>
            <p className="hint">Kjo është oferta. Pranoje dhe e njëjta punë kalon te Servis & montim.</p>
            <button type="button" className="btn gold" data-testid="accept-job" onClick={() => void accept()}>Pranoje</button>
          </>
        ) : null}
      </section>

      <div className="actions">
        <button type="button" className="btn" data-testid="print-offer" onClick={() => void printOffer()}>Printo / Shpërndaj ofertën</button>
        {priceWarning ? <p className="warn" data-testid="need-price">Shkruaj çmimin e shitjes</p> : null}
        <button type="button" className="btn gold" data-testid="save-job" onClick={() => void save()}>{draft || dirty ? "Ruaj" : "E ruajtur"}</button>
        <button type="button" className="btn danger" onClick={onDelete}>Fshi</button>
      </div>

      <aside className="sticky-profit no-print" data-testid="job-totals">
        {totals.detail > 0 ? <div className="kv"><span>Detajet</span><b>{lek(totals.detail)}</b></div> : null}
        {totals.hasSell ? (
          <>
            <div className="kv"><span>Kostoja</span><b data-testid="total-cost">{lek(totals.cost)}</b></div>
            <div className="kv"><span>Shitja me TVSH</span><b data-testid="total-sell">{lek(totals.sell)}</b></div>
            <div className="kv"><span>TVSH për shtetin</span><b>{lek(totals.vatToPay)}</b></div>
            <div className="kv"><span>FITIMI</span><span data-testid="profit-amount"><Money value={totals.profit} /></span></div>
            <div className="kv"><span>Marzhi</span><b data-testid="margin">{totals.margin.toFixed(1)}%</b></div>
            <p className="hint">{lek(totals.beforeVat)} para TVSH-së së mbetur. TVSH për shtetin është {lek(totals.vatToPay)}, prandaj fitimi nuk është thjesht shitja minus kostoja.</p>
          </>
        ) : (
          <p data-testid="need-sell">Shkruaj çmimin e shitjes.</p>
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
        <span className="hint">Zgjidh dhe shtyp Shto, pastaj ndrysho shumën.</span>
        <select value={id} onChange={(event) => setId(event.target.value)}>
          <option value="">—</option>
          {book.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </Field>
      <button type="button" className="btn" disabled={!item} onClick={() => item && onAdd(item)}>Shto</button>
    </div>
  );
}
