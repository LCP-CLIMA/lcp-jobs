import { formatDate } from "../lib/format";
import { statusLabel } from "../lib/status";
import type { JobRecord, Offer } from "../lib/types";

export function JobHome({
  mode,
  jobs,
  offers,
  onOpen,
  onOpenOffer,
  onNew,
}: {
  mode: "offer" | "work";
  jobs: JobRecord[];
  offers: Offer[];
  onOpen: (id: string) => void;
  onOpenOffer: (id: string) => void;
  onNew: (kind: "install" | "service", status: "quote" | "scheduled") => void;
}) {
  const shown = jobs
    .filter((job) => mode === "offer" ? job.status === "quote" : job.status !== "quote")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div className="stack" data-testid={mode === "offer" ? "offer-home" : "job-home"}>
      {mode === "offer" ? (
        <button type="button" className="btn gold" onClick={() => onNew("install", "quote")}>Ofertë e re</button>
      ) : (
        <>
          <button type="button" className="btn gold" data-testid="new-install" onClick={() => onNew("install", "quote")}>Montim i ri</button>
          <button type="button" className="btn" data-testid="new-service" onClick={() => onNew("service", "quote")}>Servis i ri</button>
        </>
      )}
      <p className="hint">{mode === "offer"
        ? "Ofertat. Kur e pranon, e njëjta punë kalon te Servis & montim."
        : "Punët e pranuara. Montimi i ri fillon si ofertë."}</p>
      {shown.length === 0 ? <p>{mode === "offer" ? "Ende pa oferta." : "Ende pa punë të pranuara."}</p> : null}
      {shown.map((job) => (
        <button key={job.id} type="button" className="job" onClick={() => onOpen(job.id)}>
          <strong>{job.customerName || "Pa emër"}</strong>
          <span className="meta">{formatDate(job.date) || "Pa datë"} · {statusLabel(job.status)} · {job.kind === "service" ? "Servis" : "Montim"}{job.money?.size ? ` · ${job.money.size}` : ""}</span>
        </button>
      ))}
      {mode === "offer" && offers.length > 0 ? (
        <>
          <h2>Oferta të ruajtura më parë</h2>
          {offers.map((offer) => (
            <button key={offer.id} type="button" className="job" onClick={() => onOpenOffer(offer.id)}>
              <strong>{offer.customerName || "Pa emër"}</strong>
              <span className="meta">{formatDate(offer.date)} · {offer.size || "pa madhësi"}</span>
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}
