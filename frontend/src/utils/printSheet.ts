import { mmToPx } from "../data/photoPresets";

export type PaperId = "a4" | "letter";

export const PAPERS: Record<PaperId, { label: string; widthMm: number; heightMm: number }> = {
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  letter: { label: "US Letter", widthMm: 215.9, heightMm: 279.4 },
};

export function sheetPixels(paper: PaperId, dpi = 300): { width: number; height: number } {
  return { width: mmToPx(PAPERS[paper].widthMm, dpi), height: mmToPx(PAPERS[paper].heightMm, dpi) };
}

export function sheetTiles(input: {
  photoWidth: number;
  photoHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  margin: number;
  gap: number;
}): { columns: number; rows: number; count: number } {
  const innerWidth = input.sheetWidth - input.margin * 2;
  const innerHeight = input.sheetHeight - input.margin * 2;
  if (innerWidth < input.photoWidth || innerHeight < input.photoHeight) {
    return { columns: 0, rows: 0, count: 0 };
  }
  const columns = Math.floor((innerWidth + input.gap) / (input.photoWidth + input.gap));
  const rows = Math.floor((innerHeight + input.gap) / (input.photoHeight + input.gap));
  return { columns, rows, count: columns * rows };
}
