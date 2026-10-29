import type { FaceBox } from "./photoFrame";

export type FaceEngine = "shape-detection" | "unavailable" | "failed";

export type FaceDetection = {
  faces: FaceBox[];
  engine: FaceEngine;
};

type DetectedFace = { boundingBox: { x: number; y: number; width: number; height: number } };

type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect: (image: CanvasImageSource) => Promise<DetectedFace[]>;
};

function browserDetector(): FaceDetectorCtor | null {
  const candidate = (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  return typeof candidate === "function" ? candidate : null;
}

export async function detectFaces(
  source: CanvasImageSource,
  detect?: (source: CanvasImageSource) => Promise<FaceBox[]>,
): Promise<FaceDetection> {
  if (detect) {
    try {
      return { faces: await detect(source), engine: "shape-detection" };
    } catch {
      return { faces: [], engine: "failed" };
    }
  }
  const Detector = browserDetector();
  if (!Detector) return { faces: [], engine: "unavailable" };
  try {
    const found = await new Detector({ fastMode: true, maxDetectedFaces: 5 }).detect(source);
    return {
      faces: found.map((face) => ({
        x: face.boundingBox.x,
        y: face.boundingBox.y,
        width: face.boundingBox.width,
        height: face.boundingBox.height,
      })),
      engine: "shape-detection",
    };
  } catch {
    return { faces: [], engine: "failed" };
  }
}

export function largestFace(faces: FaceBox[]): FaceBox | null {
  if (faces.length === 0) return null;
  return faces.reduce((best, face) => (face.width * face.height > best.width * best.height ? face : best));
}
