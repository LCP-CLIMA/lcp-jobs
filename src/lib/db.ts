import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  defaultSettings,
  exampleService,
  hitachiExample,
  normalizeJob,
  normalizeSettings,
  profitExample,
} from "./defaults";
import { makeSamplePhoto } from "./photos";
import type { JobRecord, Offer, PhotoRecord, Settings } from "./types";

interface Schema extends DBSchema {
  jobs: { key: string; value: JobRecord };
  photos: { key: string; value: PhotoRecord; indexes: { "by-job": string } };
  offers: { key: string; value: Offer };
  kv: { key: string; value: { key: string; value: Settings } };
}

export type Loaded = {
  jobs: JobRecord[];
  settings: Settings;
  persisted: boolean | null;
};

let opening: Promise<IDBPDatabase<Schema>> | null = null;

function database(): Promise<IDBPDatabase<Schema>> {
  if (!opening) {
    opening = openDB<Schema>("lcp-clima", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("jobs")) db.createObjectStore("jobs", { keyPath: "id" });
        if (!db.objectStoreNames.contains("photos")) {
          const photos = db.createObjectStore("photos", { keyPath: "id" });
          photos.createIndex("by-job", "jobId");
        }
        if (!db.objectStoreNames.contains("offers")) db.createObjectStore("offers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
      },
    });
  }
  return opening;
}

async function persistStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

let loaded: Promise<Loaded> | null = null;

export function loadApp(): Promise<Loaded> {
  if (!loaded) loaded = load();
  return loaded;
}

async function load(): Promise<Loaded> {
  const db = await database();
  const existing = await db.get("kv", "settings");
  if (!existing) {
    const settings = defaultSettings();
    await db.put("kv", { key: "settings", value: settings });
    await db.put("jobs", hitachiExample());
    await db.put("jobs", profitExample());
    await db.put("jobs", exampleService());
    try {
      const blob = await makeSamplePhoto();
      await db.put("photos", {
        id: "example-photo",
        jobId: hitachiExample().id,
        caption: "Example photo (foto shembull). Delete this.",
        createdAt: "2026-11-22T09:00:00.000Z",
        tag: "before",
        blob,
      });
    } catch {
      /* sample photo is optional */
    }
  }
  const settings = normalizeSettings((await db.get("kv", "settings"))?.value);
  const jobs = (await db.getAll("jobs")).map((job) => normalizeJob(job));
  const persisted = await persistStorage();
  return { jobs, settings, persisted };
}

export async function getAllJobs(): Promise<JobRecord[]> {
  const db = await database();
  return (await db.getAll("jobs")).map((job) => normalizeJob(job));
}

export async function readNow(): Promise<Loaded> {
  const db = await database();
  const settings = normalizeSettings((await db.get("kv", "settings"))?.value);
  const jobs = (await db.getAll("jobs")).map((job) => normalizeJob(job));
  let persisted: boolean | null = null;
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    persisted = null;
  }
  return { jobs, settings, persisted };
}

export async function saveJob(job: JobRecord): Promise<void> {
  const db = await database();
  await db.put("jobs", job);
}

export async function deleteJob(id: string): Promise<void> {
  const db = await database();
  const photos = await db.getAllFromIndex("photos", "by-job", id);
  const tx = db.transaction(["jobs", "photos"], "readwrite");
  for (const photo of photos) tx.objectStore("photos").delete(photo.id);
  tx.objectStore("jobs").delete(id);
  await tx.done;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await database();
  await db.put("kv", { key: "settings", value: settings });
}

export async function getPhotos(jobId: string): Promise<PhotoRecord[]> {
  const db = await database();
  const photos = await db.getAllFromIndex("photos", "by-job", jobId);
  return photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await database();
  return db.getAll("photos");
}

export async function putPhoto(photo: PhotoRecord): Promise<void> {
  const db = await database();
  await db.put("photos", photo);
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await database();
  await db.delete("photos", id);
}

export async function replaceAll(input: { jobs: JobRecord[]; settings: Settings; photos: PhotoRecord[]; offers?: Offer[] }): Promise<void> {
  const db = await database();
  const tx = db.transaction(["jobs", "photos", "offers", "kv"], "readwrite");
  await tx.objectStore("jobs").clear();
  await tx.objectStore("photos").clear();
  await tx.objectStore("offers").clear();
  for (const job of input.jobs) tx.objectStore("jobs").put(normalizeJob(job));
  for (const photo of input.photos) tx.objectStore("photos").put(photo);
  for (const offer of input.offers ?? []) tx.objectStore("offers").put(offer);
  tx.objectStore("kv").put({ key: "settings", value: normalizeSettings(input.settings) });
  await tx.done;
}

export async function getOffers(): Promise<Offer[]> {
  const db = await database();
  return (await db.getAll("offers")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveOffer(offer: Offer): Promise<void> {
  const db = await database();
  await db.put("offers", offer);
}

export async function deleteOffer(id: string): Promise<void> {
  const db = await database();
  await db.delete("offers", id);
}

export async function storageEstimate(): Promise<{ usage?: number; quota?: number; persisted: boolean | null }> {
  let persisted: boolean | null = null;
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch {
    persisted = null;
  }
  try {
    const estimate = await navigator.storage?.estimate?.();
    return { usage: estimate?.usage, quota: estimate?.quota, persisted };
  } catch {
    return { persisted };
  }
}

export async function askPersist(): Promise<boolean | null> {
  return persistStorage();
}
