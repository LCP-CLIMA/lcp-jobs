import { useMemo, useState } from "react";
import { isService } from "../lib/defaults";
import { formatDate } from "../lib/format";
import { compute } from "../lib/calc";
import { serviceCompute } from "../lib/service";
import { isFinished, SERVICE_STATUSES, STATUSES, kindLabel, statusLabel } from "../lib/status";
import type { JobKind, JobRecord, JobStatus } from "../lib/types";
import { Dialog, Money } from "../ui";

function netOf(job: JobRecord): number {
  return isService(job) ? serviceCompute(job).net : compute(job).net;
}

export function JobList({
  jobs,
  onOpen,
  onNewInstall,
  onNewService,
  focus = "both",
}: {
  jobs: JobRecord[];
  onOpen: (id: string) => void;
  onNewInstall: () => void;
  onNewService: () => void;
  focus?: "install" | "service" | "both";
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<JobKind | "all">("all");
  const [status, setStatus] = useState<JobStatus | "all">("all");
  const [newest, setNewest] = useState(true);
  const [hideHint, setHideHint] = useState(() => localStorage.getItem("lcp-hide-install-hint") === "1");
  const [editFinished, setEditFinished] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter((job) => {
      if (kind !== "all" && job.kind !== kind) return false;
      if (status !== "all" && job.status !== status) return false;
      if (!q) return true;
      const hay = [
        job.customerName,
        job.phone,
        job.address,
        job.notes,
        job.kind === "install" ? `${job.brand} ${job.model} ${job.serial} ${job.title}` : `${job.problem} ${job.found} ${job.done}`,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => {
      const byDate = (a.date || "0000").localeCompare(b.date || "0000");
      if (byDate !== 0) return newest ? -byDate : byDate;
      return newest ? -a.updatedAt.localeCompare(b.updatedAt) : a.updatedAt.localeCompare(b.updatedAt);
    });
    return list;
  }, [jobs, query, kind, status, newest]);

  const active = shown.filter((job) => !isFinished(job.status));
  const finished = shown.filter((job) => isFinished(job.status));
  const total = shown.reduce((sum, job) => sum + netOf(job), 0);
  const card = (job: JobRecord, finishedCard: boolean) => (
    <div key={job.id} className="job">
      <button type="button" className="job-open" onClick={() => (finishedCard ? setEditFinished(job.id) : onOpen(job.id))}>
        <div className="card-top">
          <strong>{job.customerName || "Untitled job (pa emër)"}</strong>
          <Money value={netOf(job)} />
        </div>
        <div className="meta">
          {formatDate(job.date) || "No date"} · {statusLabel(job.status, job.kind)} · {kindLabel(job.kind)}
          {job.kind === "install" ? ` · ${job.size}` : ""}
        </div>
        <div className="meta">{job.address || (job.kind === "install" ? `${job.brand} ${job.model}`.trim() : job.problem)}</div>
      </button>
      {finishedCard ? (
        <button type="button" className="btn" onClick={() => setEditFinished(job.id)}>Edit (ndrysho)</button>
      ) : null}
    </div>
  );

  return (
    <div className="stack">
      {hideHint ? null : (
        <div className="callout">
          <strong>Install on iPhone</strong>
          Safari → Share → Add to Home Screen. Then open LCP Clima from the icon.
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={() => { localStorage.setItem("lcp-hide-install-hint", "1"); setHideHint(true); }}>
              Hide (fshih)
            </button>
          </div>
        </div>
      )}
      <div className="actions">
        {focus !== "service" ? <button type="button" className="btn primary" onClick={onNewInstall}>New install (instalim i ri)</button> : null}
        {focus !== "install" ? <button type="button" className="btn gold" onClick={onNewService}>New service call (dalje servisi)</button> : null}
      </div>
      <input value={query} placeholder="Search name, phone, address (kërko)" onChange={(event) => setQuery(event.target.value)} />
      <div className="seg">
        {(["all", "install", "service"] as const).map((item) => (
          <button key={item} type="button" className={kind === item ? "on" : ""} onClick={() => setKind(item)}>
            {item === "all" ? "All (të gjitha)" : item === "install" ? "Install" : "Service"}
          </button>
        ))}
      </div>
      <div className="chips">
        <button type="button" className={`chip${status === "all" ? " on" : ""}`} onClick={() => setStatus("all")}>All</button>
        {(focus === "service" ? SERVICE_STATUSES : STATUSES).map((item) => (
          <button key={item.id} type="button" className={`chip${status === item.id ? " on" : ""}`} onClick={() => setStatus(item.id)}>
            {focus === "service" ? item.sq : item.en}
          </button>
        ))}
      </div>
      <div className="spread">
        <button type="button" className="btn" onClick={() => setNewest((value) => !value)}>{newest ? "Newest date" : "Oldest date"}</button>
        <div className="total-line"><Money value={total} /></div>
      </div>
      <p className="hint">{shown.length} on this list (në listë). The total is their net profit.</p>
      <h2>Active jobs (punë aktive)</h2>
      {active.length === 0 ? <p>No active jobs (asnjë punë aktive).</p> : active.map((job) => card(job, false))}
      <h2>Finished jobs (punë të përfunduara)</h2>
      <p className="hint">Done and Paid jobs are saved here. (Punët Done dhe Paid ruhen këtu.)</p>
      {finished.length === 0 ? <p>No finished jobs yet (ende pa punë të përfunduara).</p> : finished.map((job) => card(job, true))}
      <p className="hint">Back up from Settings. iPhone can erase data in an app you do not open for a long time. (Bëj kopje te Cilësimet.)</p>
      {editFinished ? (
        <Dialog title="Edit a finished job? (Të ndryshosh një punë të përfunduar?)" onClose={() => setEditFinished(null)}>
          <p>Are you sure you want to edit a finished job? (Je i sigurt që do ta ndryshosh një punë të përfunduar?)</p>
          <div className="actions">
            <button type="button" className="btn gold" onClick={() => { const id = editFinished; setEditFinished(null); onOpen(id); }}>Yes (po)</button>
            <button type="button" className="btn" onClick={() => setEditFinished(null)}>Cancel (anulo)</button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
