import type { JobKind, JobStatus, PhotoTag } from "./types";

export const STATUSES: { id: JobStatus; en: string; sq: string }[] = [
  { id: "quote", en: "Quote", sq: "Ofertë" },
  { id: "scheduled", en: "Scheduled", sq: "Planifikuar" },
  { id: "progress", en: "In progress", sq: "Në proces" },
  { id: "done", en: "Done", sq: "Përfunduar" },
  { id: "paid", en: "Paid", sq: "Paguar" },
];

/** Service jobs use these four labels. Done and Paid both become the last one. */
export const SERVICE_STATUSES: { id: JobStatus; en: string; sq: string }[] = [
  { id: "quote", en: "Quote", sq: "Ofertë" },
  { id: "scheduled", en: "Scheduled", sq: "E planifikuar" },
  { id: "progress", en: "In Progress", sq: "Në proces" },
  { id: "paid", en: "Done and Paid", sq: "Përfunduar dhe paguar" },
];

export function normalizeServiceStatus(status: string | undefined): JobStatus {
  if (status === "quote" || status === "scheduled" || status === "progress") return status;
  if (status === "done" || status === "paid") return "paid";
  return "quote";
}

export function statusLabel(id: JobStatus, kind?: JobKind): string {
  if (kind === "service") {
    const mapped = id === "done" ? "paid" : id;
    const service = SERVICE_STATUSES.find((item) => item.id === mapped);
    if (service) return `${service.sq} (${service.en})`;
  }
  const s = STATUSES.find((x) => x.id === id);
  return s ? `${s.en} (${s.sq})` : id;
}

export function isFinished(status: JobStatus): boolean {
  return status === "done" || status === "paid";
}

export function kindLabel(kind: JobKind): string {
  return kind === "service" ? "Service (servis)" : "Install (instalim)";
}

export const PHOTO_TAGS: { id: PhotoTag; en: string; sq: string }[] = [
  { id: "whatsapp", en: "WhatsApp", sq: "para vizitës" },
  { id: "before", en: "Before", sq: "Para" },
  { id: "after", en: "After", sq: "Pas" },
  { id: "other", en: "Other", sq: "Tjetër" },
];
