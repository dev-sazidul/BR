import { describe, expect, it } from "vitest";

import { NATURAL_BACKGROUNDS, NATURAL_CATEGORIES } from "../data/backgroundPresets";
import { createSnapshot } from "./imageGeometry";
import {
  centeredAspectCrop,
  outputSizeFor,
  rotatedBounds,
  withRotation,
  withSize,
} from "./imageGeometry";

describe("image geometry", () => {
  it("swaps the frame for a 90 degree rotation", () => {
    expect(rotatedBounds(20, 10, 90)).toEqual({ width: 10, height: 20 });
    const snapshot = withRotation(createSnapshot(20, 10), 20, 10, 90);
    expect(snapshot.width).toBe(10);
    expect(snapshot.height).toBe(20);
  });

  it("keeps a square crop centered", () => {
    expect(centeredAspectCrop({ width: 200, height: 100 }, 1)).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
  });

  it("locks output aspect and caps the longest edge", () => {
    const sized = withSize(createSnapshot(100, 50), 100, 50, "width", 200);
    expect(sized).toMatchObject({ width: 200, height: 100, sized: true });
    expect(outputSizeFor(8000, 4000, 0, null)).toEqual({ width: 4096, height: 2048 });
  });

  it("lists every preset category without duplicate ids", () => {
    const ids = NATURAL_BACKGROUNDS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    NATURAL_CATEGORIES.forEach((category) => {
      expect(NATURAL_BACKGROUNDS.some((preset) => preset.category === category.id)).toBe(true);
    });
    expect(
      NATURAL_BACKGROUNDS.every(
        (preset) => preset.thumb.startsWith("/backgrounds/thumbs/") && preset.full.startsWith("/backgrounds/full/") && preset.author.length > 0,
      ),
    ).toBe(true);
  });
});
