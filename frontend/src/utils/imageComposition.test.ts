import { describe, expect, it } from "vitest";

import { createSnapshot } from "./imageGeometry";
import { paintComposition } from "./imageComposition";
import { editedFilename, exportPlan } from "./imageExport";

function fakeContext(ops: string[]) {
  return {
    fillStyle: "",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as const,
    setTransform() {},
    clearRect() {
      ops.push("clear");
    },
    fillRect() {
      ops.push("fill");
    },
    drawImage() {
      ops.push("draw");
    },
    translate() {},
    rotate() {},
    scale() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
  };
}

describe("image composition", () => {
  it("paints a solid background behind the subject", () => {
    const ops: string[] = [];
    paintComposition(fakeContext(ops) as unknown as CanvasRenderingContext2D, {
      foreground: { width: 8, height: 8, source: {} as CanvasImageSource },
      backgroundImage: null,
      snapshot: { ...createSnapshot(8, 8), background: { type: "color", color: "#FFFFFF", presetId: "solid-white" } },
      includeBackground: true,
      underlay: null,
      destWidth: 8,
      destHeight: 8,
      scale: 1,
      createCanvas: () => ({ width: 8, height: 8, getContext: () => fakeContext([]) }) as unknown as HTMLCanvasElement,
    });
    expect(ops.indexOf("fill")).toBeGreaterThan(-1);
    expect(ops.indexOf("fill")).toBeLessThan(ops.indexOf("draw"));
  });

  it("leaves a transparent export unfilled", () => {
    const ops: string[] = [];
    paintComposition(fakeContext(ops) as unknown as CanvasRenderingContext2D, {
      foreground: { width: 8, height: 8, source: {} as CanvasImageSource },
      backgroundImage: null,
      snapshot: createSnapshot(8, 8),
      includeBackground: false,
      underlay: null,
      destWidth: 8,
      destHeight: 8,
      scale: 1,
      createCanvas: () => ({ width: 8, height: 8, getContext: () => fakeContext([]) }) as unknown as HTMLCanvasElement,
    });
    expect(ops).not.toContain("fill");
    expect(ops).toContain("draw");
  });

  it("flattens JPEG onto white when the background is transparent", () => {
    expect(exportPlan("jpeg", "transparent", { type: "transparent" })).toMatchObject({
      includeBackground: false,
      underlay: "#FFFFFF",
      mime: "image/jpeg",
    });
    expect(exportPlan("png", "transparent", { type: "color", color: "#000000", presetId: null })).toMatchObject({
      includeBackground: false,
      underlay: null,
    });
    expect(editedFilename("portrait.png", "jpeg")).toBe("portrait-edit.jpg");
  });
});
