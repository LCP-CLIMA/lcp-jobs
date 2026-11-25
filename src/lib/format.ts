import type { Tone } from "./types";

export function num(s: string): number {
  const v = parseFloat((s || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export function lek(v: number): string {
  return `${Math.round(v).toLocaleString("en-US")} Lek`;
}

export function toneOf(v: number): Tone {
  const r = Math.round(v);
  if (r > 0) return "pos";
  if (r < 0) return "neg";
  return "zero";
}

/** Profit/loss text with an explicit + or −. Zero stays unsigned. */
export function signedLek(v: number): { text: string; tone: Tone } {
  const r = Math.round(v);
  const abs = Math.abs(r).toLocaleString("en-US");
  if (r > 0) return { text: `+${abs} Lek`, tone: "pos" };
  if (r < 0) return { text: `−${abs} Lek`, tone: "neg" };
  return { text: "0 Lek", tone: "zero" };
}

export function signedPercent(v: number): { text: string; tone: Tone } {
  const r = Math.round(v * 10) / 10;
  if (r > 0) return { text: `+${r.toFixed(1)}%`, tone: "pos" };
  if (r < 0) return { text: `−${Math.abs(r).toFixed(1)}%`, tone: "neg" };
  return { text: "0.0%", tone: "zero" };
}

/** Accepts DD/MM/YYYY or YYYY-MM-DD. Returns YYYY-MM-DD, or null when incomplete. */
export function parseDateInput(text: string): string | null {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  const yyyy = iso?.[1] ?? dmy?.[3];
  const mm = iso?.[2] ?? dmy?.[2]?.padStart(2, "0");
  const dd = iso?.[3] ?? dmy?.[1]?.padStart(2, "0");
  if (!yyyy || !mm || !dd) return null;
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function mapsUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address.trim())}`;
}
