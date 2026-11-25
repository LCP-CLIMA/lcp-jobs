import { useMemo, useState } from "react";
import { formatDate, lek } from "../lib/format";
import { moneyTotals } from "../lib/simple";
import type { JobRecord } from "../lib/types";
import { Money } from "../ui";

function monthKey(date: string): string {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

export function ProfitScreen({ jobs, onOpen }: { jobs: JobRecord[]; onOpen: (id: string) => void }) {
  const months = useMemo(() => {
    const keys = new Set(jobs.map((job) => monthKey(job.date)).filter(Boolean));
    const today = monthKey(new Date().toISOString().slice(0, 10));
    if (today) keys.add(today);
    return [...keys].sort().reverse();
  }, [jobs]);
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString().slice(0, 10)));
  const rows = jobs
    .filter((job) => !/^example\b/i.test(job.customerName) && !job.id.startsWith("example-"))
    .filter((job) => monthKey(job.date) === month)
    .map((job) => ({ job, totals: moneyTotals(job.money) }))
    .sort((a, b) => (a.job.date || "").localeCompare(b.job.date || ""));
  const revenue = rows.reduce((sum, row) => sum + row.totals.sell, 0);
  const cost = rows.reduce((sum, row) => sum + row.totals.cost, 0);
  const profit = rows.reduce((sum, row) => sum + row.totals.profit, 0);
  const netRevenue = revenue / 1.2;
  const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return (
    <div className="stack" data-testid="profit-screen">
      <section className="card stack">
        <h2>Fitim / humbje</h2>
        <p className="hint">Vetëm për lexim.</p>
        <label className="field">
          <span>Muaji</span>
          <select data-testid="profit-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
        </label>
        <div className="kv"><span>Të ardhurat</span><b>{lek(revenue)}</b></div>
        <div className="kv"><span>Kostoja</span><b>{lek(cost)}</b></div>
        <div className="kv"><span>Fitimi</span><Money value={profit} /></div>
        <div className="kv"><span>Marzhi</span><b>{margin.toFixed(1)}%</b></div>
      </section>
      {rows.length === 0 ? <p>Asnjë punë këtë muaj.</p> : null}
      {rows.map(({ job, totals }) => (
        <button key={job.id} type="button" className="job" onClick={() => onOpen(job.id)}>
          <div className="card-top">
            <strong>{job.customerName || "Pa emër"}</strong>
            <Money value={totals.profit} />
          </div>
          <div className="meta">{formatDate(job.date) || "Pa datë"} · {job.kind === "service" ? "Servis" : "Montim"}</div>
          <div className="meta">Shitja {lek(totals.sell)} · Kostoja {lek(totals.cost)} · {totals.margin.toFixed(1)}%</div>
        </button>
      ))}
    </div>
  );
}
