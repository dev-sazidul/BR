import { describe, expect, it } from "vitest";

import {
  COUNTRY_ORDER,
  PHOTO_PRESETS,
  PRESETS_CHECKED_ON,
  backgroundConflict,
  mmToPx,
  presetById,
} from "./photoPresets";
import { detectFaces, largestFace } from "../utils/faceDetect";
import { jpegWithDpi, pngWithDpi } from "../utils/imageDpi";
import { autoCrop, moveCrop, scaleCrop } from "../utils/photoFrame";
import { sheetPixels, sheetTiles } from "../utils/printSheet";

describe("photo presets", () => {
  it("keeps one id per preset and a source for every checked document", () => {
    const ids = PHOTO_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    PHOTO_PRESETS.forEach((preset) => {
      expect(preset.widthPx).toBeGreaterThan(0);
      expect(preset.heightPx).toBeGreaterThan(0);
      expect(preset.lastChecked).toBe(PRESETS_CHECKED_ON);
      if (preset.kind === "document") {
        expect(preset.sources.length).toBeGreaterThan(0);
        preset.sources.forEach((source) => expect(source.url.startsWith("https://")).toBe(true));
      }
      if (preset.verified) expect(preset.sources[0]?.url).toMatch(/^https:\/\//);
      if (!preset.verified && preset.kind === "document") expect(preset.sourceNote.toLowerCase()).toContain("unverified");
      if (preset.unit === "mm") {
        expect(Math.abs(preset.widthPx - (preset.width / 25.4) * preset.dpi)).toBeLessThan(1.5);
        expect(Math.abs(preset.heightPx - (preset.height / 25.4) * preset.dpi)).toBeLessThan(1.5);
      }
      if (preset.unit === "in") {
        expect(preset.widthPx).toBe(Math.round(preset.width * preset.dpi));
        expect(preset.heightPx).toBe(Math.round(preset.height * preset.dpi));
      }
    });
    COUNTRY_ORDER.forEach((country) => {
      expect(PHOTO_PRESETS.some((preset) => preset.country === country)).toBe(true);
    });
  });

  it("warns when a document background conflicts and leaves the choice unchanged", () => {
    const passport = presetById("us-passport");
    const before = passport.backgroundColors.map((color) => color.hex).join(",");
    expect(backgroundConflict(passport, { kind: "color", hex: "#FFFFFF" })).toBeNull();
    expect(backgroundConflict(passport, { kind: "color", hex: "#0000ff" })).toMatch(/left as you chose it/i);
    expect(backgroundConflict(passport, { kind: "photo", id: "studio" })).toMatch(/plain background/i);
    expect(passport.backgroundColors.map((color) => color.hex).join(",")).toBe(before);
    expect(backgroundConflict(presetById("linkedin"), { kind: "photo", id: "studio" })).toBeNull();
  });
});

describe("photo framing", () => {
  it("locks the crop to the preset ratio and keeps a detected face inside the photo", () => {
    const preset = presetById("uk-passport");
    const frame = autoCrop({
      imageWidth: 1200,
      imageHeight: 1600,
      face: { x: 400, y: 300, width: 200, height: 200 },
      outputWidth: preset.widthPx,
      outputHeight: preset.heightPx,
      headMin: preset.headMin,
      headMax: preset.headMax,
      crownGap: preset.crownGap,
    });
    expect(frame.usedFace).toBe(true);
    expect(frame.shrunk).toBe(false);
    expect(frame.crop.width / frame.crop.height).toBeCloseTo(preset.widthPx / preset.heightPx, 5);
    expect(frame.crop.x).toBeGreaterThanOrEqual(0);
    expect(frame.crop.y).toBeGreaterThanOrEqual(0);
    expect(frame.crop.x + frame.crop.width).toBeLessThanOrEqual(1200);
    expect(frame.crop.y + frame.crop.height).toBeLessThanOrEqual(1600);
    expect(frame.crop.x + frame.crop.width / 2).toBeCloseTo(500, 0);
  });

  it("centers a crop when no face is available and keeps manual zoom inside the image", () => {
    const frame = autoCrop({
      imageWidth: 200,
      imageHeight: 100,
      face: null,
      outputWidth: 1,
      outputHeight: 1,
      headMin: null,
      headMax: null,
      crownGap: 0.1,
    });
    expect(frame.crop).toMatchObject({ x: 50, y: 0, width: 100, height: 100 });
    const closer = scaleCrop(frame.crop, 2, 200, 100);
    expect(closer.width).toBeCloseTo(50, 5);
    expect(closer.width / closer.height).toBeCloseTo(1, 5);
    expect(closer.x).toBeGreaterThanOrEqual(0);
    expect(closer.x + closer.width).toBeLessThanOrEqual(200);
    const moved = moveCrop(closer, -1000, 1000, 200, 100);
    expect(moved.x).toBe(0);
    expect(moved.y + moved.height).toBeCloseTo(100, 5);
  });

  it("shrinks a frame that cannot contain the requested head size", () => {
    const frame = autoCrop({
      imageWidth: 80,
      imageHeight: 80,
      face: { x: 10, y: 10, width: 60, height: 60 },
      outputWidth: 35,
      outputHeight: 45,
      headMin: 0.7,
      headMax: 0.8,
      crownGap: 0.1,
    });
    expect(frame.shrunk).toBe(true);
    expect(frame.crop.width / frame.crop.height).toBeCloseTo(35 / 45, 5);
    expect(frame.crop.width).toBeLessThanOrEqual(80);
    expect(frame.crop.height).toBeLessThanOrEqual(80);
  });
});

describe("face detection fallback", () => {
  it("returns no faces when this browser has no detector", async () => {
    const result = await detectFaces(document.createElement("canvas"));
    expect(result).toEqual({ faces: [], engine: "unavailable" });
  });

  it("returns no faces when the detector fails", async () => {
    const result = await detectFaces(document.createElement("canvas"), async () => {
      throw new Error("detector failed");
    });
    expect(result).toEqual({ faces: [], engine: "failed" });
  });

  it("uses the largest face when several are found", () => {
    const faces = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 40, height: 30 },
    ];
    expect(largestFace(faces)).toEqual(faces[1]);
    expect(largestFace([])).toBeNull();
  });
});

describe("print output", () => {
  it("counts copies separately from the photo size", () => {
    const tiles = sheetTiles({ photoWidth: 100, photoHeight: 100, sheetWidth: 400, sheetHeight: 400, margin: 0, gap: 0 });
    expect(tiles).toEqual({ columns: 4, rows: 4, count: 16 });
    expect(sheetTiles({ photoWidth: 500, photoHeight: 100, sheetWidth: 400, sheetHeight: 400, margin: 10, gap: 0 }).count).toBe(0);
    const sheet = sheetPixels("a4");
    const photo = { width: mmToPx(50.8), height: mmToPx(50.8) };
    expect(photo).toEqual({ width: 600, height: 600 });
    expect(sheet.width).toBeGreaterThan(photo.width);
    expect(sheet.height).toBeGreaterThan(photo.height);
  });

  it("writes JPEG and PNG density without changing the image marker", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
    const tagged = jpegWithDpi(jpeg, 300);
    expect(tagged[0]).toBe(0xff);
    expect(tagged[1]).toBe(0xd8);
    expect(String.fromCharCode(...tagged.subarray(6, 11))).toBe("JFIF\0");
    expect(tagged[13]).toBe(1);
    expect(new DataView(tagged.buffer).getUint16(14)).toBe(300);

    const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new Uint8Array(25);
    new DataView(ihdr.buffer).setUint32(0, 13);
    ihdr.set([73, 72, 68, 82], 4);
    const idat = new Uint8Array(12);
    idat.set([73, 68, 65, 84], 4);
    const png = new Uint8Array(signature.length + ihdr.length + idat.length);
    png.set(signature, 0);
    png.set(ihdr, signature.length);
    png.set(idat, signature.length + ihdr.length);
    const next = pngWithDpi(png, 300);
    const phys = next.indexOf(112); // start of a chunk type is not unique; search the type bytes
    const typeAt = (bytes: Uint8Array, type: string) => {
      for (let index = 0; index < bytes.length - 4; index += 1) {
        if (String.fromCharCode(...bytes.subarray(index, index + 4)) === type) return index;
      }
      return -1;
    };
    expect(typeAt(next, "pHYs")).toBeGreaterThan(-1);
    expect(typeAt(next, "pHYs")).toBeLessThan(typeAt(next, "IDAT"));
    expect(phys).toBeGreaterThan(-1);
  });
});
