import { compute } from "./calc";
import { isService } from "./defaults";
import { serviceCompute } from "./service";
import type { JobKind, JobRecord } from "./types";

export type ProfitRow = {
  id: string;
  name: string;
  date: string;
  kind: JobKind;
  profit: number;
  running: number;
};

export function jobProfit(job: JobRecord): number {
  return isService(job) ? serviceCompute(job).net : compute(job).net;
}

/** Oldest first, so the running total is the profit or loss so far. */
export function profitRows(jobs: JobRecord[]): ProfitRow[] {
  const sorted = [...jobs].sort((a, b) => {
    const ad = a.date || "9999-99-99";
    const bd = b.date || "9999-99-99";
    if (ad !== bd) return ad.localeCompare(bd);
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
  let running = 0;
  return sorted.map((job) => {
    const profit = jobProfit(job);
    running += profit;
    const named = job.customerName || (job.kind === "install" ? job.title : "") || "Pa emër";
    return { id: job.id, name: named, date: job.date, kind: job.kind, profit, running };
  });
}
