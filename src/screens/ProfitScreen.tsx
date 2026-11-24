import { formatDate } from "../lib/format";
import { profitRows } from "../lib/profit";
import type { JobRecord } from "../lib/types";
import { Money } from "../ui";

export function ProfitScreen({ jobs, onOpen }: { jobs: JobRecord[]; onOpen: (id: string) => void }) {
  const rows = profitRows(jobs);
  const total = rows.at(-1)?.running ?? 0;
  return (
    <div className="stack" data-testid="profit-screen">
      <section className="card stack">
        <h2>Fitim / Humbje</h2>
        <p className="hint">Çdo punë instalimi dhe servisi, sipas datës. E gjelbra është fitim, e kuqja është humbje. “Deri këtu” është totali deri në atë rresht.</p>
        <div className="kv total-line"><span>Totali deri tani</span><Money value={total} /></div>
      </section>
      {rows.length === 0 ? <p>Ende pa punë.</p> : null}
      {rows.map((row) => (
        <button key={row.id} type="button" className="job" onClick={() => onOpen(row.id)}>
          <div className="card-top">
            <strong>{row.name}</strong>
            <Money value={row.profit} />
          </div>
          <div className="meta">{formatDate(row.date) || "Pa datë"} · {row.kind === "service" ? "Servis" : "Montim"}</div>
          <div className="spread">
            <span className="meta">Deri këtu</span>
            <Money value={row.running} />
          </div>
        </button>
      ))}
    </div>
  );
}
