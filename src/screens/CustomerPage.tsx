import { useState } from "react";
import logo from "../assets/logo.jpg";
import { customerShareText, type SheetLine } from "../lib/customerOffer";
import { COMPANY } from "../lib/company";
import { lek } from "../lib/format";
import { whatsappHref } from "../lib/offer";

export function CustomerPage({
  customerName,
  phone,
  address,
  date,
  description,
  lines,
  total,
  net,
  vat,
  showVat,
  companyPhone,
  tiers,
}: {
  customerName: string;
  phone: string;
  address: string;
  date: string;
  description: string;
  lines: SheetLine[];
  total: number;
  net: number;
  vat: number;
  showVat: boolean;
  companyPhone: string;
  tiers: { name: string; sell: string }[];
}) {
  const text = customerShareText({
    companyPhone,
    customerName,
    phone,
    address,
    date,
    description,
    lines,
    total,
    net,
    vat,
    showVat,
  });
  return (
    <div className="stack">
      <article className="print-sheet" data-testid="offer-sheet">
        <img className="offer-logo" src={logo} alt="L.C.P Clima" />
        <h1>{COMPANY.legal}</h1>
        <p>
          {COMPANY.city}, {COMPANY.country}
          <br />
          NUIS {COMPANY.nuis}
          {companyPhone ? <><br />Tel {companyPhone}</> : null}
        </p>
        <h2>OFERTË</h2>
        <p><b>Klienti:</b> {customerName || "—"}</p>
        <p><b>Telefoni:</b> {phone || "—"}</p>
        <p><b>Adresa:</b> {address || "—"}</p>
        <p><b>Data:</b> {date || "—"}</p>
        <p><b>Përshkrimi:</b> {description || "—"}</p>
        {lines.map((line) => (
          <div key={line.label} className="kv">
            <span>{line.label}{line.detail ? <small className="hint"> {line.detail}</small> : null}</span>
            <b>{lek(line.amount)}</b>
          </div>
        ))}
        {tiers.map((tier) => (
          <div key={tier.name + tier.sell} className="kv">
            <span>{tier.name || "Opsion"}</span>
            <b>{lek(Number(tier.sell) || 0)}</b>
          </div>
        ))}
        {showVat ? (
          <>
            <div className="kv"><span>Nëntotali pa TVSH</span><b>{lek(net)}</b></div>
            <div className="kv"><span>TVSH 20%</span><b>{lek(vat)}</b></div>
          </>
        ) : null}
        <div className="kv total-line" data-testid="offer-total"><span>Çmimi me TVSH</span><b>{lek(total)}</b></div>
      </article>
      <ShareBar text={text} phone={phone} />
    </div>
  );
}

function ShareBar({ text, phone }: { text: string; phone: string }) {
  const [notice, setNotice] = useState("");
  async function share() {
    setNotice("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ofertë LCP Clima", text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Teksti u kopjua.");
    } catch {
      setNotice(text);
    }
  }
  return (
    <div className="actions no-print">
      <button type="button" className="btn gold" data-testid="share-offer" onClick={() => void share()}>Shpërndaj</button>
      <a className="btn" data-testid="whatsapp-offer" href={whatsappHref(text, phone)} target="_blank" rel="noreferrer">WhatsApp</a>
      <button type="button" className="btn" data-testid="print-pdf" onClick={() => window.print()}>Printo / PDF</button>
      {notice ? <p className="hint">{notice}</p> : null}
    </div>
  );
}
