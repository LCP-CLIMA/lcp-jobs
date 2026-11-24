import logo from "../assets/logo.jpg";
import { COMPANY } from "../lib/company";
import { compute } from "../lib/calc";
import { isService } from "../lib/defaults";
import { formatDate, lek, num } from "../lib/format";
import { evaluateReading } from "../lib/charge";
import { serviceCompute } from "../lib/service";
import { statusLabel } from "../lib/status";
import type { InstallJob, JobRecord, ServiceJob } from "../lib/types";
import { Money } from "../ui";

function Head({ title, phone }: { title: string; phone: string }) {
  return (
    <header>
      <img className="offer-logo" src={logo} alt="L.C.P Clima" />
      <h1>{COMPANY.brand}</h1>
      <p>{COMPANY.legal}<br />NUIS {COMPANY.nuis}<br />{COMPANY.city}, {COMPANY.country}{phone ? <><br />{phone}</> : null}</p>
      <h2>{title}</h2>
    </header>
  );
}

function PriceLines({ showVat, net, vat, total }: { showVat: boolean; net: number; vat: number; total: number }) {
  if (!showVat) return <div className="kv total-line"><span>Çmimi</span><b>{lek(net)}</b></div>;
  return (
    <>
      <div className="kv"><span>Nëntotali pa TVSH</span><b>{lek(net)}</b></div>
      <div className="kv"><span>TVSH 20%</span><b>{lek(vat)}</b></div>
      <div className="kv total-line"><span>Totali me TVSH</span><b>{lek(total)}</b></div>
    </>
  );
}

function CompanyFoot({ phone }: { phone: string }) {
  return (
    <div className="sign">
      <strong>{COMPANY.brand}</strong>
      {phone ? <div>{phone}</div> : null}
    </div>
  );
}

function Customer({ job }: { job: JobRecord }) {
  return (
    <>
      <p><b>Klienti:</b> {job.customerName || "—"}</p>
      <p><b>Telefoni:</b> {job.phone || "—"}</p>
      <p><b>Adresa:</b> {job.address || "—"}</p>
      <p><b>Data:</b> {formatDate(job.date) || "—"}</p>
    </>
  );
}

function InstallQuote({ job, phone }: { job: InstallJob; phone: string }) {
  const result = compute(job);
  const showVat = job.showVatOnQuote === true;
  const title = job.status === "paid" ? "FATURË" : "OFERTË";
  return (
    <article className="print-sheet">
      <Head title={title} phone={phone} />
      <Customer job={job} />
      <p><b>Përshkrimi:</b> Instalim kondicioneri {job.size} {job.brand} {job.model}. {job.refrigerant ? `Gaz ftohës: ${job.refrigerant}.` : ""} {job.serial ? `Serial: ${job.serial}.` : ""}</p>
      <PriceLines showVat={showVat} net={result.netRev} vat={result.outVat} total={result.sell} />
      <CompanyFoot phone={phone} />
    </article>
  );
}

function ServiceReport({ job, phone }: { job: ServiceJob; phone: string }) {
  const result = serviceCompute(job);
  const showVat = job.showVatOnQuote === true;
  return (
    <article className="print-sheet">
      <Head title={job.status === "paid" ? "FATURË SHËRBIMI" : "RAPORT SHËRBIMI / FATURË"} phone={phone} />
      <Customer job={job} />
      <p>Kontrolli paraprak në WhatsApp është falas. Klienti dërgon foto ose video para se të dalim.</p>
      {job.whatsappLog ? <p><b>WhatsApp:</b> {job.whatsappLog}</p> : null}
      <p>
        Vizita e parë është 1 orë kontroll i përgjithshëm për të kuptuar problemin. Ajo zbritet nga riparimi nëse klienti e pranon. Zona falas është {job.freeKm || "0"} km vajtje.
        Nëse nuk e pranon, paguan vetëm vizitën. Km tej zonës llogariten vajtje-ardhje, {lek(num(job.perExtraKm))} për km.
      </p>
      <p><b>Problemi i raportuar:</b> {job.problem || "—"}</p>
      <p><b>Çfarë u gjet:</b> {job.found || "—"}</p>
      <p><b>Çfarë u bë:</b> {job.done || "—"}</p>
      <p><b>Koha:</b> {Math.round(result.minutes)} min. Blloqe shtesë 30 min: {result.blocks}.</p>
      <p><b>Km vajtje:</b> {job.km || "0"}. Km shtesë vajtje-ardhje: {result.extraKm}.</p>
      {showVat ? <div className="kv"><span>Vizita diagnostikuese</span><b>{lek(result.visitFee)}</b></div> : null}
      {showVat && job.repairAccepted ? <div className="kv"><span>Riparimi</span><b>{lek(result.repair)}</b></div> : null}
      {showVat && job.repairAccepted ? (job.repairOptions ?? []).filter((option) => option.enabled).map((option) => (
        <div key={option.id} className="kv"><span>{option.name}</span><b>{lek(num(option.price))}</b></div>
      )) : null}
      {!job.repairAccepted ? <p>Riparimi nuk u pranua. Paguhet vetëm vizita.</p> : null}
      {showVat && job.repairAccepted ? job.materials.filter((row) => num(row.qty) * num(row.price)).map((row) => (
        <div key={row.id} className="kv"><span>{row.name || "Material"} × {row.qty}</span><b>{lek(num(row.qty) * num(row.price))}</b></div>
      )) : null}
      {showVat && job.repairAccepted && result.gasGross ? <div className="kv"><span>Gaz, {job.refG} g</span><b>{lek(result.gasGross)}</b></div> : null}
      {showVat && job.repairAccepted ? <div className="kv"><span>Zbritje e tarifës së vizitës</span><b>−{Math.round(result.visitCredit).toLocaleString("en-US")} Lek</b></div> : null}
      <PriceLines showVat={showVat} net={result.netRev} vat={result.outVat} total={result.sell} />
      {(job.chargeReadings ?? []).slice(0, 1).map((reading) => {
        const charge = evaluateReading(reading);
        return (
          <div key={reading.id}>
            <h2>Kontroll Sistemi / Ngarkesa</h2>
            <p>{charge.techSummary}</p>
            <h3>Shpjegim për klientin</h3>
            <p>{charge.customerText}</p>
          </div>
        );
      })}
      <CompanyFoot phone={phone} />
    </article>
  );
}

function Internal({ job }: { job: InstallJob }) {
  const result = compute(job);
  return (
    <article className="print-sheet">
      <Head title="Cost sheet / Fletë kostoje" phone="" />
      <p>{job.customerName} · {formatDate(job.date)} · {statusLabel(job.status)} · {job.size}</p>
      <p>{job.brand} {job.model} {job.serial}</p>
      <p>Supplier: {job.supplier || "—"} · Unit {lek(result.unitLek)}</p>
      {result.breakdown.filter((line) => line.gross > 0).map((line) => (
        <div key={line.label} className="kv"><span>{line.label}</span><b>{lek(line.gross)}</b></div>
      ))}
      <div className="kv"><span>Real cost</span><b>{lek(result.costReal)}</b></div>
      <div className="kv"><span>Selling price</span><b>{lek(result.sell)}</b></div>
      <div className="kv"><span>Net profit</span><Money value={result.net} /></div>
      <div className="kv"><span>Break-even price</span><b>{lek(result.breakEven)}</b></div>
      <p className="hint">Tax thresholds are not verified. Confirm with your accountant before relying on them.</p>
    </article>
  );
}

export function PrintView({ job, mode, phone }: { job: JobRecord; mode: "quote" | "internal"; phone: string }) {
  if (isService(job)) return <ServiceReport job={job} phone={phone} />;
  if (mode === "internal") return <Internal job={job} />;
  return <InstallQuote job={job} phone={phone} />;
}
