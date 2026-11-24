import type { PhotoRecord, PhotoTag } from "./types";

export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not compress this photo.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("Could not compress this photo.");
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function makeSamplePhoto(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#efe4d2";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(80, 120, 1040, 620);
  ctx.strokeStyle = "#1b4332";
  ctx.lineWidth = 8;
  ctx.strokeRect(760, 220, 280, 360);
  ctx.fillStyle = "#f8f4ee";
  ctx.fillRect(768, 228, 264, 344);
  ctx.strokeStyle = "#c6862a";
  ctx.lineWidth = 6;
  for (let y = 270; y < 540; y += 32) {
    ctx.beginPath();
    ctx.moveTo(790, y);
    ctx.lineTo(1010, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#1b4332";
  ctx.font = "600 46px sans-serif";
  ctx.fillText("LCP Clima", 120, 250);
  ctx.font = "400 28px sans-serif";
  ctx.fillText("Example photo — delete and add the real install.", 120, 310);
  ctx.fillText("Foto shembull — fshije dhe shto punën reale.", 120, 352);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("sample");
  return blob;
}

export function newPhoto(jobId: string, blob: Blob, tag: PhotoTag): PhotoRecord {
  return {
    id: crypto.randomUUID(),
    jobId,
    caption: "",
    createdAt: new Date().toISOString(),
    tag,
    blob,
  };
}
