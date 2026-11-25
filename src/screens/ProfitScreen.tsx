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
  const profit = rows.reduce((sum, row) => sum + row.totals.profit, 0);
  const netRevenue = revenue / 1.2;
  const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return (
    <div className="stack" data-testid="profit-screen">
      <section className="card stack">
        <h2>Fitim / humbje <small className="hint">Profit &amp; loss. Read only.</small></h2>
        <label className="field">
          <span>Muaji <small className="hint">Month</small></span>
          <select data-testid="profit-month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
          </select>
        </label>
        <div className="kv"><span>Të ardhurat <small>Revenue</small></span><b>{lek(revenue)}</b></div>
        <div className="kv"><span>Kostoja <small>Cost</small></span><b>{lek(cost)}</b></div>
        <div className="kv"><span>Fitimi <small>Profit</small></span><Money value={profit} /></div>
        <div className="kv"><span>Marzhi <small>Margin</small></span><b>{margin.toFixed(1)}%</b></div>
      </section>
      {rows.length === 0 ? <p>No saved jobs in this month. (Asnjë punë këtë muaj.)</p> : null}
      {rows.map(({ job, totals }) => (
        <button key={job.id} type="button" className="job" onClick={() => onOpen(job.id)}>
          <div className="card-top">
            <strong>{job.customerName || "No name"}</strong>
            <Money value={totals.profit} />
          </div>
          <div className="meta">{formatDate(job.date) || "Pa datë"} · {job.kind === "service" ? "Servis" : "Montim"}</div>
          <div className="meta">Shitja {lek(totals.sell)} · Kostoja {lek(totals.cost)} · {totals.margin.toFixed(1)}%</div>
        </button>
      ))}
    </div>
  );
}
