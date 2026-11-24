import type { JobKind, JobStatus, PhotoTag } from "./types";

export const STATUSES: { id: JobStatus; en: string; sq: string }[] = [
  { id: "quote", en: "Quote", sq: "Ofertë" },
  { id: "scheduled", en: "Scheduled", sq: "Planifikuar" },
  { id: "progress", en: "In progress", sq: "Në proces" },
  { id: "done", en: "Done", sq: "Përfunduar" },
  { id: "paid", en: "Paid", sq: "Paguar" },
];

export function statusLabel(id: JobStatus): string {
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
