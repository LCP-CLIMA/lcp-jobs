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
