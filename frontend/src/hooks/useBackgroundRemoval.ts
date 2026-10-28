import { useCallback, useEffect, useRef, useState } from "react";

import { useObjectUrl } from "./useObjectUrl";
import { isAbortError, readErrorMessage } from "../services/api";
import { downloadResult, fetchResultBlob, removeBackground } from "../services/imageService";
import type { RemovalResult } from "../types/api";
import { downloadBlob } from "../utils/download";
import { validateClientFile } from "../utils/validateFile";

export type RemovalPhase = "idle" | "uploading" | "processing" | "ready" | "error";

export function useBackgroundRemoval(maxBytes: number) {
  const [file, setFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [meta, setMeta] = useState<RemovalResult | null>(null);
  const [phase, setPhase] = useState<RemovalPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [jpgBusy, setJpgBusy] = useState(false);
  const busy = useRef(false);
  const jpgLock = useRef(false);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const originalUrl = useObjectUrl(file);
  const resultUrl = useObjectUrl(resultBlob);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    requestId.current += 1;
    abortRef.current?.abort();
    busy.current = false;
    setFile(null);
    setResultBlob(null);
    setMeta(null);
    setPhase("idle");
    setError(null);
    setUploadProgress(null);
    setJpgBusy(false);
  }, []);

  const start = useCallback(
    async (next: File) => {
      if (busy.current) return;
      const problem = validateClientFile(next, maxBytes);
      if (problem) {
        setError(problem);
        return;
      }

      const id = ++requestId.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      busy.current = true;
      setFile(next);
      setResultBlob(null);
      setMeta(null);
      setError(null);
      setUploadProgress(null);
      setPhase("uploading");

      try {
        const created = await removeBackground(next, {
          signal: controller.signal,
          onUploadProgress: (loaded, total) => {
            if (requestId.current !== id || !total) return;
            const ratio = loaded / total;
            setUploadProgress(ratio);
            if (ratio >= 1) setPhase("processing");
          },
        });
        if (requestId.current !== id) return;
        setMeta(created);
        setPhase("processing");
        const blob = await fetchResultBlob(created.result_url, controller.signal);
        if (requestId.current !== id) return;
        setResultBlob(blob);
        setPhase("ready");
      } catch (err) {
        if (requestId.current !== id || isAbortError(err)) return;
        setPhase("error");
        setError(await readErrorMessage(err));
      } finally {
        if (requestId.current === id) busy.current = false;
      }
    },
    [maxBytes],
  );

  const retry = useCallback(() => {
    if (file) void start(file);
  }, [file, start]);

  const downloadPng = useCallback(() => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, "solva-cutout.png");
  }, [resultBlob]);

  const downloadJpg = useCallback(
    async (background: string) => {
      if (!meta || jpgLock.current) return;
      jpgLock.current = true;
      setJpgBusy(true);
      try {
        await downloadResult(meta.download_url, "jpeg", background);
      } catch (err) {
        setError(await readErrorMessage(err));
      } finally {
        jpgLock.current = false;
        setJpgBusy(false);
      }
    },
    [meta],
  );

  return {
    file,
    originalUrl,
    resultUrl,
    meta,
    phase,
    error,
    uploadProgress,
    jpgBusy,
    busy: phase === "uploading" || phase === "processing",
    start,
    retry,
    reset,
    downloadPng,
    downloadJpg,
  };
}
