import { useEffect, useMemo, useState } from "react";

import { Button } from "../common/Button";

type Photo = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { medium: string; large: string };
};
type SearchResponse = { photos: Photo[]; page: number; hasNextPage: boolean };

export function SmartBackgroundSearch({
  subject,
  onApply,
}: {
  subject: HTMLImageElement;
  onApply: (photo: Photo) => void;
}) {
  const [scene, setScene] = useState("");
  const [color, setColor] = useState("neutral");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  const orientation = subject.naturalWidth >= subject.naturalHeight ? "landscape" : "portrait";
  const searchQuery = useMemo(() => {
    const context = scene.trim();
    return context ? `${context} ${color} tone background` : `${color} tone studio background`;
  }, [color, scene]);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(subject, 0, 0, 40, 40);
      const pixels = context.getImageData(0, 0, 40, 40).data;
      const buckets = new Map<string, number>();
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 96) continue;
        const key = `${pixels[index] >> 5},${pixels[index + 1] >> 5},${pixels[index + 2] >> 5}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      const dominant = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (dominant) {
        const [r, g, b] = dominant.split(",").map(Number);
        setColor(colorName(r * 32 + 16, g * 32 + 16, b * 32 + 16));
      }
    } catch {
      setColor("neutral");
    }
  }, [subject]);

  async function search(nextPage: number) {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: searchQuery, page: String(nextPage), orientation });
      const response = await fetch(`/api/v1/backgrounds/search?${params.toString()}`);
      const payload = (await response.json()) as SearchResponse | { error?: { message?: string } };
      if (!response.ok) throw new Error("error" in payload ? payload.error?.message : undefined);
      const result = payload as SearchResponse;
      setPhotos(result.photos);
      setSelected(null);
      setApplied(null);
      setPage(result.page);
      setHasNextPage(result.hasNextPage);
      if (result.photos.length === 0) setError("No Pexels photos matched this scene. Try another description.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Background search failed. Try again or use a preset/custom background.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" aria-label="Smart background search">
      <div>
        <h3 className="text-sm font-semibold">Find Backgrounds</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          Color sampled from the transparent subject: <span className="font-semibold capitalize">{color}</span>. Add the subject or scene to guide the free Pexels search.
        </p>
        <a className="mt-1 inline-block text-xs font-semibold underline" href="https://www.pexels.com/" target="_blank" rel="noreferrer">Photos provided by Pexels</a>
      </div>
      <label className="block text-xs font-semibold" htmlFor="smart-background-scene">
        Scene or subject
        <input
          id="smart-background-scene"
          value={scene}
          maxLength={100}
          placeholder="e.g. golden retriever in a sunny park"
          className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm font-medium"
          onChange={(event) => setScene(event.target.value)}
        />
      </label>
      <Button className="w-full" disabled={busy} onClick={() => void search(1)}>
        {busy ? "Searching…" : "Find Backgrounds"}
      </Button>
      <p className="text-[11px] leading-4 text-muted">Search suggestion: {searchQuery}. Subject colors and aspect ratio are analyzed in your browser; scene meaning comes from your description.</p>
      {error ? <p role="status" className="rounded-lg bg-brand-soft p-2 text-xs leading-5 text-brand-dark">{error}</p> : null}
      {photos.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                aria-pressed={selected === photo.id}
                className={`overflow-hidden rounded-xl border text-left ${selected === photo.id ? "border-brand ring-2 ring-brand" : "border-line"}`}
                onClick={() => setSelected(photo.id)}
              >
                <img src={photo.src.medium} alt={photo.alt || "Pexels background preview"} loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
                <a className="block truncate px-2 pt-1.5 text-[11px] font-medium underline" href={photo.url} target="_blank" rel="noreferrer">
                  Photo by {photo.photographer} on Pexels
                </a>
                <span className="block px-2 pb-1.5 text-[10px] text-muted">Open photo credit</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={busy || !hasNextPage} onClick={() => void search(page + 1)}>
              Next Background
            </Button>
            <Button className="flex-1" disabled={selected === null} onClick={() => {
              const photo = photos.find((item) => item.id === selected);
              if (photo) {
                onApply(photo);
                setApplied(photo.id);
              }
            }}>
              Apply Background
            </Button>
          </div>
          <p className="text-[11px] leading-4 text-muted">
            Photos provided by <a className="font-semibold underline" href="https://www.pexels.com/" target="_blank" rel="noreferrer">Pexels</a>. Credit the photographer when possible.
            {applied !== null ? (() => {
              const photo = photos.find((item) => item.id === applied);
              return photo ? <> Applied: <a className="underline" href={photo.url} target="_blank" rel="noreferrer">Photo by {photo.photographer} on Pexels</a>.</> : null;
            })() : null}
          </p>
        </>
      ) : null}
      <div className="rounded-xl border border-line p-3">
        <Button variant="secondary" className="w-full" disabled aria-describedby="background-generation-status">
          AI Generate Background
        </Button>
        <p id="background-generation-status" className="mt-2 text-xs leading-5 text-muted">
          Unavailable on this deployment: it has no background-generation model or GPU. No paid or credit-based generator is used. Free online search and existing presets remain available.
        </p>
      </div>
    </div>
  );
}

function colorName(red: number, green: number, blue: number): string {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max < 55) return "black";
  if (min > 215) return "white";
  if (max - min < 28) return max < 125 ? "gray" : "neutral";
  if (red > green * 1.3 && red > blue * 1.25) return green > 90 ? "orange" : "red";
  if (green > red * 1.15 && green > blue * 1.05) return "green";
  if (blue > red * 1.12 && blue > green * 1.08) return "blue";
  if (red > 120 && green > 70 && blue < 110) return "warm brown";
  return "neutral";
}
