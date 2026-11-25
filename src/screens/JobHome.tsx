import type { JobRecord } from "../lib/types";
import { formatDate } from "../lib/format";

export function JobHome({
  jobs,
  onOpen,
  onNew,
}: {
  jobs: JobRecord[];
  onOpen: (id: string) => void;
  onNew: (kind: "install" | "service") => void;
}) {
  const ordered = [...jobs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div className="stack" data-testid="job-home">
      <button type="button" className="btn gold" data-testid="new-install" onClick={() => onNew("install")}>New installation <small>Montim i ri</small></button>
      <button type="button" className="btn" data-testid="new-service" onClick={() => onNew("service")}>New service <small>Servis i ri</small></button>
      <p className="hint">Open a job to enter its cost and the price you sell at. Profit is on the Profit &amp; loss tab.</p>
      {ordered.length === 0 ? <p>No jobs yet. (Ende pa punë.)</p> : null}
      {ordered.map((job) => (
        <button key={job.id} type="button" className="job" onClick={() => onOpen(job.id)}>
          <strong>{job.customerName || "No name"}</strong>
          <span className="meta">{formatDate(job.date) || "No date"} · {job.kind === "service" ? "Service" : "Installation"}</span>
        </button>
      ))}
    </div>
  );
}
