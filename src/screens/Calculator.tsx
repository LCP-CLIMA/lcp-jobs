import type { ReactNode } from "react";
import { applySize, btuFor, compute, fuelPerKm, included, perKm, qtyOf, refPerKg, SIZES, PIPES, withPipes, fixedPerKm } from "../lib/calc";
import { lek, num } from "../lib/format";
import type { InstallJob, Pipe, Row, Size } from "../lib/types";
import { CostAmount, Field, IncomeAmount, Money, Percent, ProfitHero, Section, Toggle } from "../ui";

function Gate({ label, on, onChange, children }: { label: string; on: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <div className={`check-item${on ? " open" : ""}`}>
      <label className="check-row">
        <input type="checkbox" checked={on} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {on ? <div className="check-body">{children}</div> : null}
    </div>
  );
}

function patchRow(rows: Row[], id: string, patch: Partial<Row>): Row[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function Rows({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  return (
    <div className="stack">
      {rows.map((row) => {
        const gross = qtyOf(row) * num(row.price);
        const short = row.id === "t1" && num(row.qty) > 0 && num(row.qty) < 3;
        const metres = row.id === "t1";
        const on = row.enabled !== false;
        return (
          <div key={row.id} className={`check-item${on ? " open" : ""}`}>
            <label className="check-row">
              <input type="checkbox" checked={on} onChange={(event) => onChange(patchRow(rows, row.id, { enabled: event.target.checked }))} />
              <span>{row.name}</span>
            </label>
            {on ? (
              <div className="check-body">
                {row.note ? <p className="hint">{row.note}</p> : null}
                {short ? <p className="warn">Minimum is 3 m: counted as 3 m. (Minimumi është 3 m: llogaritet si 3 m.)</p> : null}
                <div className="row">
                  <Field label={metres ? "Metres (metra)" : "Qty (sasia)"}>
                    <input inputMode="decimal" value={row.qty} onChange={(event) => onChange(patchRow(rows, row.id, { qty: event.target.value }))} />
                  </Field>
                  <Field label={metres ? "Lek per metre" : "Unit price, Lek"}>
                    <input inputMode="decimal" value={row.price} onChange={(event) => onChange(patchRow(rows, row.id, { price: event.target.value }))} />
                  </Field>
                </div>
                <div className="line-foot">
                  <Toggle label="VAT invoice (faturë me TVSH)" checked={row.vat} onChange={(vat) => onChange(patchRow(rows, row.id, { vat }))} />
                  <CostAmount value={gross} />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function Calculator({ job, onChange }: { job: InstallJob; onChange: (job: InstallJob) => void }) {
  const result = compute(job);
  const set = <K extends keyof InstallJob>(key: K, value: InstallJob[K]) => onChange({ ...job, [key]: value });
  const pick = (rows: Row[], ids: string[]) => rows.filter((row) => ids.includes(row.id));
  const merge = (all: Row[], edited: Row[]) => {
    const map = new Map(edited.map((row) => [row.id, row]));
    return all.map((row) => map.get(row.id) ?? row);
  };

  return (
    <div className="stack">
      <ProfitHero
        net={result.net}
        detail={
          <>
            Margin <Percent value={result.margin} /> · {job.vatReg ? "VAT-registered math" : "Not VAT-registered math"}
          </>
        }
      />

      <Section title="This job (kjo punë)">
        <div className="kv"><span>Real cost (kosto reale)</span><CostAmount value={result.costReal} /></div>
        <div className="kv"><span>Selling price (çmimi)</span><IncomeAmount value={result.sell} /></div>
        <div className="kv"><span>Break-even price</span><b>{lek(result.breakEven)}</b></div>
      </Section>

      <Section title="Result lines (rezultati)">
        <div className="kv"><span>Total paid out, incl. VAT (gjithsej paguar)</span><b>{lek(result.costGross)}</b></div>
        <div className="kv"><span>Input VAT deductible (TVSH e zbritshme)</span><b>{lek(result.inputVat)}</b></div>
        <div className="kv"><span>Real cost (kosto reale)</span><b>{lek(result.costReal)}</b></div>
        <div className="kv"><span>Selling price to customer, VAT incl.</span><b>{lek(result.sell)}</b></div>
        <div className="kv"><span>Net revenue ex-VAT (të ardhura pa TVSH)</span><b>{lek(result.netRev)}</b></div>
        <div className="kv"><span>Output VAT charged (TVSH e shitjes)</span><b>{lek(result.outVat)}</b></div>
        <div className="kv"><span>VAT payable to tax office (TVSH për t'u paguar)</span><b>{lek(result.vatPay)}</b></div>
        <div className="kv"><span>Gross profit (fitim bruto)</span><Money value={result.gross} /></div>
        <div className="kv"><span>Profit tax estimate (tatim fitimi {num(job.taxRate)}%)</span><b>{lek(result.tax)}</b></div>
        <div className="kv"><span>Net profit (fitim neto)</span><Money value={result.net} /></div>
        <div className="kv"><span>Profit margin on net revenue</span><Percent value={result.margin} /></div>
        <p className="hint">
          Where the money went: {result.breakdown.filter((line) => line.gross > 0).map((line) => `${line.label} ${lek(line.gross)}`).join(" · ")}.
        </p>
      </Section>

      <Section title="This job's size (madhësia e kësaj pune)">
        <div className="seg">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={job.size === size ? "on" : ""}
              onClick={() => {
                const next = applySize(job, size as Size);
                if (!job.btu || job.btu === btuFor(job.size)) next.btu = btuFor(size);
                onChange(next);
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="hint">Only {job.size} is on this job. Customer price = the unit's VAT-inclusive buying price + the {job.size} package ({lek(num(job.book.package[job.size]))}). No markup.</p>
      </Section>

      <p className="hint">Tick a cost to open it. Unticked lines stay out of the total. (Zgjidh koston. Të pazgjedhurat nuk hyjnë në total.)</p>

      <Section title="1. Job and unit (puna dhe njësia)">
        <div className="stack">
          <Field label="Job name (emri i punës)">
            <input value={job.title} onChange={(event) => set("title", event.target.value)} />
          </Field>
          <Field label="Supplier (furnitori)">
            <input value={job.supplier} onChange={(event) => set("supplier", event.target.value)} />
          </Field>
          <Gate label="Unit (njësia)" on={job.includeUnit !== false} onChange={(includeUnit) => set("includeUnit", includeUnit)}>
          <div className="row">
            <Field label="Currency">
              <select value={job.cur} onChange={(event) => set("cur", event.target.value as InstallJob["cur"])}>
                <option>EUR</option>
                <option>Lek</option>
              </select>
            </Field>
            <Field label={`Unit price, ${job.cur}, VAT incl.`}>
              <input inputMode="decimal" value={job.unitPrice} onChange={(event) => set("unitPrice", event.target.value)} />
            </Field>
            {job.cur === "EUR" ? (
              <Field label="EUR → Lek rate">
                <input inputMode="decimal" value={job.rate} onChange={(event) => set("rate", event.target.value)} />
              </Field>
            ) : null}
          </div>
          <p className="hint">Unit in Lek: {lek(result.unitLek)}. Default rate 1 EUR = 90.17 Lek (open.er-api.com, 22 Nov 2026). Check the Bank of Albania rate on the invoice day.</p>
          <Toggle label="Unit bought with VAT invoice (faturë me TVSH)" checked={job.unitVat} onChange={(value) => set("unitVat", value)} />
          </Gate>
          <Toggle label="L.C.P CLIMA is VAT-registered (subjekt i TVSH)" checked={job.vatReg} onChange={(value) => set("vatReg", value)} />
          <Field label="Profit tax rate (tatim fitimi)">
            <select value={job.taxRate} onChange={(event) => set("taxRate", event.target.value)}>
              <option value="0">0% small business, turnover up to 14M Lek (to check)</option>
              <option value="15">15% standard</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Labor (hak pune)">
        <Gate label="Labor and tests (hak pune dhe prova)" on={job.includeLabor !== false} onChange={(includeLabor) => set("includeLabor", includeLabor)}>
        <div className="stack">
          <Field label={`Labor paid to me (hak pune), Lek. Default ${job.size}: ${Number(job.book.labor[job.size]).toLocaleString("en-US")}`}>
            <input inputMode="decimal" value={job.labor} onChange={(event) => set("labor", event.target.value)} />
          </Field>
          <Toggle label="Count my labor as a job cost" checked={job.laborCost} onChange={(value) => set("laborCost", value)} />
          <Toggle label="Vacuum + nitrogen pressure test (vakum + azot)" checked={job.vacOn} onChange={(value) => set("vacOn", value)} />
          {job.vacOn ? (
            <Field label="Vacuum + N₂ test cost, Lek">
              <input inputMode="decimal" value={job.vac} onChange={(event) => set("vac", event.target.value)} />
            </Field>
          ) : null}
        </div>
        </Gate>
      </Section>

      <Section title="Travel / fuel (transporti)">
        <Gate label="Travel and fuel (rruga dhe nafta)" on={job.includeTransport !== false} onChange={(includeTransport) => set("includeTransport", includeTransport)}>
        <p className="hint">Type only the one-way km. The page doubles it for the round trip.</p>
        <div className="stack">
          <div className="row">
            <Field label="One-way km (km vetëm vajtje)">
              <input inputMode="decimal" value={job.km} onChange={(event) => set("km", event.target.value)} />
            </Field>
            <Field label="Diesel today, Lek/L (nafta sot)">
              <input inputMode="decimal" value={job.fuel} onChange={(event) => set("fuel", event.target.value)} />
            </Field>
          </div>
          <div className="row">
            <Field label="Set your van's consumption, L/100 km">
              <input inputMode="decimal" value={job.cons} onChange={(event) => set("cons", event.target.value)} />
            </Field>
            <Field label="Wear / maintenance, Lek/km">
              <input inputMode="decimal" value={job.wear} onChange={(event) => set("wear", event.target.value)} />
            </Field>
          </div>
          <p className="hint">Wear default 5.4 Lek/km (estimate, replace with your service bills): tyres 1.35 + oil, filters and service 1.35 + brakes 0.70 + repairs and parts 2.00. No deductible VAT on wear. Based on European van costs (T&E 2022, ADAC Fiat Doblò Cargo, Van den Hurk).</p>
          <Toggle label="Include depreciation + insurance" checked={job.inclFixed} onChange={(value) => set("inclFixed", value)} />
          {job.inclFixed ? (
            <div className="row">
              <Field label="Depreciation, Lek/km">
                <input inputMode="decimal" value={job.depr} onChange={(event) => set("depr", event.target.value)} />
              </Field>
              <Field label="Insurance + road tax per year, Lek">
                <input inputMode="decimal" value={job.insYear} onChange={(event) => set("insYear", event.target.value)} />
              </Field>
              <Field label="Km driven per year">
                <input inputMode="decimal" value={job.kmYear} onChange={(event) => set("kmYear", event.target.value)} />
              </Field>
            </div>
          ) : null}
          {job.inclFixed ? <p className="hint">Depreciation default 3.7 Lek/km is an estimate (ADAC, Doblò Cargo, 15,000 km a year). Insurance + tax: type your policy. Adds {fixedPerKm(job).toFixed(2)} Lek/km. No deductible VAT on these.</p> : null}
          <Toggle label="Fuel bought with VAT invoice (faturë me TVSH)" checked={job.fuelVat} onChange={(value) => set("fuelVat", value)} />
          <p>Cost per km: {perKm(job).toFixed(2)} Lek (fuel {fuelPerKm(job).toFixed(2)} + wear {num(job.wear).toFixed(2)}{job.inclFixed ? ` + depreciation/insurance ${fixedPerKm(job).toFixed(2)}` : ""}).</p>
          <p>Round trip {2 * num(job.km)} km = {lek(2 * num(job.km) * perKm(job))}.</p>
          <p className="hint">Default diesel 201 Lek/L is the maximum retail price set by the Transparency Board on 19 Nov 2026 (ata.gov.al). Type the price you paid.</p>
        </div>
        </Gate>
      </Section>

      <Section title="Gas / refrigerant (gaz)">
        <Gate label="Refrigerant top-up (shtesë gazi)" on={job.includeGas !== false} onChange={(includeGas) => set("includeGas", includeGas)}>
        <div className="stack">
          <div className="row">
            <Field label="Bottle price, Lek">
              <input inputMode="decimal" value={job.bottlePrice} onChange={(event) => set("bottlePrice", event.target.value)} />
            </Field>
            <Field label="Bottle net weight, kg">
              <input inputMode="decimal" value={job.bottleKg} onChange={(event) => set("bottleKg", event.target.value)} />
            </Field>
          </div>
          <p className="hint">Check the label: R-410A bottles are often 11.3 kg, R-32 often 9–10 kg. A "12 L" bottle is the cylinder size, not the gas weight.</p>
          <div className="row">
            <Field label="Extra metres beyond pre-charged length">
              <input inputMode="decimal" value={job.refExtraM} onChange={(event) => set("refExtraM", event.target.value)} />
            </Field>
            <Field label="Extra charge, g/m (unit plate)">
              <input inputMode="decimal" value={job.refGpm} onChange={(event) => set("refGpm", event.target.value)} />
            </Field>
          </div>
          <p>Suggested from the plate rule: {num(job.refExtraM)} m × {num(job.refGpm)} g/m = {Math.round(num(job.refExtraM) * num(job.refGpm))} g.</p>
          <div className="row">
            <Field label="Grams added (gramë të shtuara)">
              <input inputMode="decimal" value={job.refG} onChange={(event) => set("refG", event.target.value)} />
            </Field>
            <button type="button" className="btn" onClick={() => set("refG", String(Math.round(num(job.refExtraM) * num(job.refGpm))))}>Use suggested grams</button>
          </div>
          <Toggle label="Gas bought with VAT invoice" checked={job.refVat} onChange={(value) => set("refVat", value)} />
          <p>Price per kg: {lek(refPerKg(job))}. {num(job.refG)} g = {lek((num(job.refG) / 1000) * refPerKg(job))}.</p>
        </div>
        </Gate>
      </Section>

      <Section title="Installation materials (materiale instalimi)" caption="Pipes, drain and trunking. Tick a line to edit it. 0 m means that line is not used. Trunking under 3 m, but not zero, counts as 3 m.">
        <div className="stack">
          <div className="row">
            <Field label="Liquid pipe">
              <select value={job.liquid} onChange={(event) => {
                const liquid = event.target.value as Pipe;
                onChange({ ...job, liquid, materials: withPipes(job.materials, liquid, job.gas, job.book.pipe) });
              }}>
                {PIPES.map((pipe) => <option key={pipe}>{pipe}</option>)}
              </select>
            </Field>
            <Field label="Gas pipe">
              <select value={job.gas} onChange={(event) => {
                const gas = event.target.value as Pipe;
                onChange({ ...job, gas, materials: withPipes(job.materials, job.liquid, gas, job.book.pipe) });
              }}>
                {PIPES.map((pipe) => <option key={pipe}>{pipe}</option>)}
              </select>
            </Field>
          </div>
          <Rows rows={pick(job.materials, ["m1", "m5", "m3"])} onChange={(edited) => set("materials", merge(job.materials, edited))} />
          <Rows rows={job.trunk} onChange={(trunk) => set("trunk", trunk)} />
        </div>
      </Section>

      <Section title="Electrical (elektrike)">
        <Rows rows={pick(job.materials, ["m2", "m6"])} onChange={(edited) => set("materials", merge(job.materials, edited))} />
      </Section>

      <Section title="Brackets (mbajtëse)">
        <Rows rows={pick(job.materials, ["m4"])} onChange={(edited) => set("materials", merge(job.materials, edited))} />
      </Section>

      <Section title="Other (të tjera)" caption="Consumables, helper and anything else.">
        <div className="stack">
          <Rows rows={job.consum} onChange={(consum) => set("consum", consum)} />
          <Rows rows={job.other} onChange={(other) => set("other", other)} />
        </div>
      </Section>

      <Section title="Extra pipe and selling price (tub shtesë dhe çmimi)">
        <Gate label="Extra pipe (tub shtesë)" on={job.includeExtra !== false} onChange={(includeExtra) => set("includeExtra", includeExtra)}>
          <div className="row">
            <Field label="Extra pipe beyond 3 m charged, m">
              <input inputMode="decimal" value={job.extraM} onChange={(event) => set("extraM", event.target.value)} />
            </Field>
            <Field label="Lek per extra m">
              <input inputMode="decimal" value={job.extraRate} onChange={(event) => set("extraRate", event.target.value)} />
            </Field>
          </div>
        </Gate>
        <p>LCP rule price: unit {lek(result.unitLek)} + package {lek(num(job.book.package[job.size]))} + extra pipe {lek(included(job.includeExtra) ? num(job.extraM) * num(job.extraRate) : 0)} = {lek(result.sellDefault)}. No markup.</p>
        <Field label="Different selling price, VAT incl. (leave empty to use LCP rule)">
          <input inputMode="decimal" placeholder={String(Math.round(result.sellDefault))} value={job.sellOverride} onChange={(event) => set("sellOverride", event.target.value)} />
        </Field>
      </Section>

      <Section title="Tax rules used (rregullat tatimore)">
        <div className="kv"><span>VAT (TVSH)</span><b>20%. VAT = price ÷ 6.</b></div>
        <p className="hint">VAT registration is mandatory above an annual turnover threshold (10M Lek in recent years). To check with your accountant for 2026.</p>
        <p className="hint">Profit tax: 15% standard. 0% for small businesses with turnover up to 14M Lek, announced through 2029. To check if HVAC services qualify.</p>
        <p className="hint">L.C.P CLIMA is VAT-registered (confirmed by Natan). The toggle is on by default.</p>
        <p className="hint">Personal tax is separate. Confirm with an accountant.</p>
        <div className="callout">
          <strong>Not yet verified (ende e paverifikuar)</strong>
          The thresholds and the 0% regime above come from general knowledge, not a source opened today. Confirm on tatime.gov.al or with your accountant before relying on them.
        </div>
      </Section>

      <details className="card">
        <summary>Trunking prices: you vs Sinani</summary>
        <p className="hint">Your trunking price is 700 Lek/m, minimum 3 m (2,100 Lek at 3 m). Sinani lists Tecnosystemi Optima with prices on request, except the flexible coupling (1,100 / 1,160 / 1,370 Lek). Ask Sinani for a trade quote (+355 69 60 77 779, info@sinani.al).</p>
        <div className="links">
          <a href="https://shop.sinani.al/products/kanaline-optima-t-opt" target="_blank" rel="noreferrer">Kanalinë Optima T OPT</a>
          <a href="https://shop.sinani.al/products/dalje-muri-me-fllanxhe-rrethore-optima-tmr-opt" target="_blank" rel="noreferrer">Dalje muri me fllanxhë rrethore</a>
          <a href="https://shop.sinani.al/products/dalje-kendore-optima-ta-opt" target="_blank" rel="noreferrer">Dalje këndore Optima TA</a>
          <a href="https://shop.sinani.al/products/bashkuese-optima-mg-35-opt" target="_blank" rel="noreferrer">Bashkuese Optima MG</a>
          <a href="https://shop.sinani.al/products/manikote-fleksibel-optima-mf-opt" target="_blank" rel="noreferrer">Manikotë fleksibël Optima MF</a>
          <a href="https://shop.sinani.al/products/tape-fundore-optima-tc-opt" target="_blank" rel="noreferrer">Tapë fundore Optima TC</a>
          <a href="https://shop.sinani.al/products/berryl-i-sheshte-optima-cp-opt" target="_blank" rel="noreferrer">Bërryl i sheshtë Optima CP</a>
          <a href="https://shop.sinani.al/products/shkume-manuale-std-pu-foam-300ml" target="_blank" rel="noreferrer">Tytan PU foam 300 ml, 320 Lek</a>
          <a href="https://shop.sinani.al/products/silikon-akrilik-i-bardhe" target="_blank" rel="noreferrer">Tytan acrylic silicone white, 240 Lek</a>
        </div>
      </details>

      <details className="card">
        <summary>Legal ways to pay less tax</summary>
        <ul>
          <li>If VAT-registered: get a VAT invoice for every purchase, so its VAT is deducted.</li>
          <li>Keep every receipt. Documented costs lower taxable profit.</li>
          <li>Pay yourself and helpers in a documented way. Check the form with your accountant.</li>
          <li>Price at or above the break-even price. Below it you lose money, whatever the tax.</li>
          <li>Splitting the bill into goods and labor does not change the VAT rate. Both are 20%.</li>
          <li>Always issue a fiscal invoice for the full amount. Unrecorded sales are illegal.</li>
        </ul>
      </details>
    </div>
  );
}
