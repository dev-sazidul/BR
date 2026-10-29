import { useCallback, useRef, useState } from "react";

import type { EditorSnapshot } from "../types/editor";

const HISTORY_LIMIT = 30;

function clone(snapshot: EditorSnapshot): EditorSnapshot {
  return structuredClone(snapshot);
}

function same(left: EditorSnapshot, right: EditorSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useEditorHistory() {
  const [past, setPast] = useState<EditorSnapshot[]>([]);
  const [present, setPresent] = useState<EditorSnapshot | null>(null);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const committed = useRef<EditorSnapshot | null>(null);
  const gesture = useRef<EditorSnapshot | null>(null);

  const boot = useCallback((initial: EditorSnapshot) => {
    const copy = clone(initial);
    pastRef.current = [];
    futureRef.current = [];
    gesture.current = null;
    committed.current = copy;
    setPast([]);
    setFuture([]);
    setPresent(copy);
  }, []);

  const stage = useCallback((next: EditorSnapshot) => {
    if (!committed.current) return;
    if (!gesture.current) gesture.current = clone(committed.current);
    setPresent(clone(next));
  }, []);

  const commit = useCallback((next: EditorSnapshot) => {
    if (!committed.current) return;
    const copy = clone(next);
    const base = gesture.current ?? committed.current;
    gesture.current = null;
    if (same(base, copy)) {
      committed.current = copy;
      setPresent(copy);
      return;
    }
    pastRef.current = [...pastRef.current, base].slice(-HISTORY_LIMIT);
    futureRef.current = [];
    committed.current = copy;
    setPast(pastRef.current);
    setFuture([]);
    setPresent(copy);
  }, []);

  const undo = useCallback(() => {
    gesture.current = null;
    if (!committed.current || pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    futureRef.current = [committed.current, ...futureRef.current];
    pastRef.current = pastRef.current.slice(0, -1);
    committed.current = previous;
    setPast(pastRef.current);
    setFuture(futureRef.current);
    setPresent(previous);
  }, []);

  const redo = useCallback(() => {
    gesture.current = null;
    if (!committed.current || futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    pastRef.current = [...pastRef.current, committed.current].slice(-HISTORY_LIMIT);
    futureRef.current = futureRef.current.slice(1);
    committed.current = next;
    setPast(pastRef.current);
    setFuture(futureRef.current);
    setPresent(next);
  }, []);

  const reset = useCallback((initial: EditorSnapshot) => {
    boot(initial);
  }, [boot]);

  return {
    present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    boot,
    stage,
    commit,
    undo,
    redo,
    reset,
  };
}
