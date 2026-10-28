import { useEffect, useState } from "react";

export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [blob]);

  return url;
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title === "Home" ? "Solva — Remove Image Backgrounds" : `${title} — Solva`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
