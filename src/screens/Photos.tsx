import { useEffect, useState } from "react";
import { deletePhoto, getPhotos, putPhoto } from "../lib/db";
import { compressImage, newPhoto } from "../lib/photos";
import { PHOTO_TAGS } from "../lib/status";
import type { PhotoRecord, PhotoTag } from "../lib/types";

function useUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function Thumb({ photo, onOpen }: { photo: PhotoRecord; onOpen: () => void }) {
  const url = useUrl(photo.blob);
  const tag = PHOTO_TAGS.find((item) => item.id === photo.tag);
  return (
    <button type="button" className="shot" onClick={onOpen}>
      {url ? <img src={url} alt={photo.caption || tag?.en || "Job photo"} /> : null}
      <span className="tag">{tag ? `${tag.en}` : photo.tag}</span>
    </button>
  );
}

export function Photos({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [tag, setTag] = useState<PhotoTag>("before");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = photos.find((photo) => photo.id === openId) ?? null;
  const openUrl = useUrl(open?.blob ?? null);

  useEffect(() => {
    void getPhotos(jobId).then(setPhotos);
  }, [jobId]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const photo = newPhoto(jobId, blob, tag);
        await putPhoto(photo);
        next.push(photo);
      }
      setPhotos(next);
    } catch {
      setError("Could not save that photo. Try another image. (Nuk u ruajt fotoja.)");
    } finally {
      setBusy(false);
    }
  }

  async function saveOpen(patch: Partial<PhotoRecord>) {
    if (!open) return;
    const next = { ...open, ...patch };
    await putPhoto(next);
    setPhotos((list) => list.map((photo) => (photo.id === next.id ? next : photo)));
  }

  return (
    <div className="stack">
      <p className="hint">Tag each photo before or after the work. Photos stay on this phone and are compressed to save space. (Para / pas. Fotot qëndrojnë në telefon.)</p>
      <div className="seg">
        {PHOTO_TAGS.map((item) => (
          <button key={item.id} type="button" className={tag === item.id ? "on" : ""} onClick={() => setTag(item.id)}>
            {item.en} ({item.sq})
          </button>
        ))}
      </div>
      <label className="btn primary full">
        {busy ? "Saving…" : "Take photo (bëj foto)"}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
      </label>
      <label className="btn full">
        Choose from library (zgjidh nga galeria)
        <input type="file" accept="image/*" multiple hidden onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
      </label>
      {error ? <p className="warn">{error}</p> : null}
      {photos.length === 0 ? <p className="hint">No photos yet (ende pa foto).</p> : null}
      <div className="photos">
        {photos.map((photo) => (
          <Thumb key={photo.id} photo={photo} onOpen={() => setOpenId(photo.id)} />
        ))}
      </div>
      {open && openUrl ? (
        <div className="lightbox">
          <div className="bar">
            <button type="button" className="btn" onClick={() => setOpenId(null)}>Close (mbyll)</button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void deletePhoto(open.id);
                setPhotos((list) => list.filter((photo) => photo.id !== open.id));
                setOpenId(null);
              }}
            >
              Delete (fshi)
            </button>
          </div>
          <img src={openUrl} alt={open.caption || "Job photo"} />
          <div className="stack" style={{ paddingBottom: 12 }}>
            <select value={open.tag} onChange={(event) => void saveOpen({ tag: event.target.value as PhotoTag })}>
              {PHOTO_TAGS.map((item) => (
                <option key={item.id} value={item.id}>{item.en} ({item.sq})</option>
              ))}
            </select>
            <input
              value={open.caption}
              placeholder="Caption (përshkrimi)"
              onChange={(event) => {
                const caption = event.target.value;
                setPhotos((list) => list.map((photo) => (photo.id === open.id ? { ...photo, caption } : photo)));
              }}
              onBlur={(event) => void saveOpen({ caption: event.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
