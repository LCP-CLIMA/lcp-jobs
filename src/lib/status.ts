import type { JobKind, JobStatus, PhotoTag } from "./types";

export const STATUSES: { id: JobStatus; en: string; sq: string }[] = [
  { id: "quote", en: "Quote", sq: "Ofertë" },
  { id: "scheduled", en: "Scheduled", sq: "Planifikuar" },
  { id: "progress", en: "In progress", sq: "Në proces" },
  { id: "done", en: "Done", sq: "Përfunduar" },
  { id: "paid", en: "Paid", sq: "Paguar" },
];

/** One job moves through these steps. Done and Paid stay separate. */
export const SERVICE_STATUSES: { id: JobStatus; en: string; sq: string }[] = [
  { id: "quote", en: "Offer", sq: "Ofertë" },
  { id: "scheduled", en: "Scheduled", sq: "E planifikuar" },
  { id: "progress", en: "In progress", sq: "Në proces" },
  { id: "done", en: "Done", sq: "Përfunduar" },
  { id: "paid", en: "Paid", sq: "Paguar" },
];

export function normalizeServiceStatus(status: string | undefined): JobStatus {
  if (status === "quote" || status === "scheduled" || status === "progress" || status === "done" || status === "paid") return status;
  return "quote";
}

export function statusLabel(id: JobStatus, _kind?: JobKind): string {
  const service = SERVICE_STATUSES.find((item) => item.id === id);
  return service ? `${service.sq} (${service.en})` : id;
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
