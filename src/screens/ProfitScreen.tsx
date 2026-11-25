import { useMemo, useState } from "react";
import { formatDate, lek } from "../lib/format";
import { moneyTotals } from "../lib/simple";
import type { JobRecord } from "../lib/types";
import { Money } from "../ui";

function monthKey(date: string): string {
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
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
    .filter((job) => monthKey(job.date) === month)
    .map((job) => ({ job, totals: moneyTotals(job.money) }))
    .sort((a, b) => (a.job.date || "").localeCompare(b.job.date || ""));
  const revenue = rows.reduce((sum, row) => sum + row.totals.sell, 0);
  const cost = rows.reduce((sum, row) => sum + row.totals.cost, 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="stack" data-testid="profit-screen">
      <section className="card stack">
        <h2>Profit &amp; loss <small className="hint">Fitim dhe humbje</small></h2>
        <label className="field">
          <span>Month <small className="hint">Muaji</small></span>
          <select data-testid="profit-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
        </label>
        <div className="kv"><span>Revenue <small>Të ardhurat</small></span><b>{lek(revenue)}</b></div>
        <div className="kv"><span>Cost <small>Kostoja</small></span><b>{lek(cost)}</b></div>
        <div className="kv"><span>Profit <small>Fitimi</small></span><Money value={profit} /></div>
        <div className="kv"><span>Margin <small>Marzhi</small></span><b>{margin.toFixed(1)}%</b></div>
      </section>
      {rows.length === 0 ? <p>No saved jobs in this month. (Asnjë punë këtë muaj.)</p> : null}
      {rows.map(({ job, totals }) => (
        <button key={job.id} type="button" className="job" onClick={() => onOpen(job.id)}>
          <div className="card-top">
            <strong>{job.customerName || "No name"}</strong>
            <Money value={totals.profit} />
          </div>
          <div className="meta">{formatDate(job.date) || "No date"} · {job.kind === "service" ? "Service" : "Installation"}</div>
          <div className="meta">Sell {lek(totals.sell)} · Cost {lek(totals.cost)} · {totals.margin.toFixed(1)}%</div>
        </button>
      ))}
    </div>
  );
}
