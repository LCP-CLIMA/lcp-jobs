import JSZip from "jszip";
import { normalizeJob, normalizeSettings } from "./defaults";
import type { JobRecord, Offer, PhotoRecord, Settings } from "./types";

export type BackupBundle = {
  jobs: JobRecord[];
  settings: Settings;
  photos: PhotoRecord[];
  offers?: Offer[];
};

export async function buildBackup(bundle: BackupBundle): Promise<Blob> {
  const zip = new JSZip();
  const exportedAt = new Date().toISOString();
  zip.file(
    "README.txt",
    [
      "LCP Clima backup",
      `Exported: ${exportedAt}`,
      `Jobs: ${bundle.jobs.length}`,
      `Offers: ${bundle.offers?.length ?? 0}`,
      `Photos: ${bundle.photos.length}`,
      "",
      "Restore: open LCP Clima → Settings (Cilësimet) → Import backup, and choose this zip.",
      "This file contains customer names, phone numbers, addresses and job photos. Keep it private.",
    ].join("\n"),
  );
  zip.file(
    "backup.json",
    JSON.stringify({ version: 2, exportedAt, app: "lcp-clima", settings: bundle.settings, jobs: bundle.jobs, offers: bundle.offers ?? [] }),
  );
  const meta = bundle.photos.map((photo) => ({
    id: photo.id,
    jobId: photo.jobId,
    caption: photo.caption,
    createdAt: photo.createdAt,
    tag: photo.tag,
    file: `photos/${photo.id}.jpg`,
  }));
  zip.file("photos.json", JSON.stringify(meta));
  for (const photo of bundle.photos) {
    zip.file(`photos/${photo.id}.jpg`, await photo.blob.arrayBuffer());
  }
  return zip.generateAsync({ type: "blob" });
}

export async function readBackup(file: Blob): Promise<BackupBundle> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const rawFile = zip.file("backup.json");
  if (!rawFile) throw new Error("This file is not an LCP Clima backup.");
  const raw = JSON.parse(await rawFile.async("string")) as {
    version?: number;
    settings?: Settings;
    jobs?: JobRecord[];
    offers?: Offer[];
  };
  if ((raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.jobs)) throw new Error("This backup version cannot be read.");
  const jobs = raw.jobs.map((job) => normalizeJob(job));
  const settings = normalizeSettings(raw.settings);
  const photos: PhotoRecord[] = [];
  const metaFile = zip.file("photos.json");
  if (metaFile) {
    const meta = JSON.parse(await metaFile.async("string")) as {
      id: string;
      jobId: string;
      caption?: string;
      createdAt?: string;
      tag?: PhotoRecord["tag"];
      file: string;
    }[];
    for (const item of meta) {
      const entry = zip.file(item.file);
      if (!entry) continue;
      const bytes = await entry.async("arraybuffer");
      photos.push({
        id: item.id,
        jobId: item.jobId,
        caption: item.caption ?? "",
        createdAt: item.createdAt ?? new Date().toISOString(),
        tag: item.tag ?? "other",
        blob: new Blob([bytes], { type: "image/jpeg" }),
      });
    }
  }
  return { jobs, settings, photos, offers: raw.offers ?? [] };
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<"shared" | "saved"> {
  const file = new File([blob], filename, { type: "application/zip" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "LCP Clima backup" });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return "saved";
}
