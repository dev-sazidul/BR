export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropWindow = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type AutoCropResult = {
  crop: CropWindow;
  shrunk: boolean;
  usedFace: boolean;
};

const CROWN_PAD = 0.45;
const CHIN_PAD = 0.15;

export function estimateHead(face: FaceBox): { crown: number; chin: number; centerX: number; height: number } {
  const crown = face.y - face.height * CROWN_PAD;
  const chin = face.y + face.height + face.height * CHIN_PAD;
  return { crown, chin, centerX: face.x + face.width / 2, height: Math.max(1, chin - crown) };
}

function place(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number; shrunk: boolean } {
  let nextWidth = width;
  let nextHeight = height;
  let shrunk = false;
  if (nextWidth > imageWidth || nextHeight > imageHeight) {
    const scale = Math.min(imageWidth / nextWidth, imageHeight / nextHeight);
    nextWidth *= scale;
    nextHeight *= scale;
    shrunk = true;
  }
  const maxX = Math.max(0, imageWidth - nextWidth);
  const maxY = Math.max(0, imageHeight - nextHeight);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
    width: nextWidth,
    height: nextHeight,
    shrunk,
  };
}

function centered(imageWidth: number, imageHeight: number, aspect: number): CropWindow {
  let width = imageWidth;
  let height = width / aspect;
  if (height > imageHeight) {
    height = imageHeight;
    width = height * aspect;
  }
  return {
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
    width,
    height,
    rotation: 0,
  };
}

export function autoCrop(input: {
  imageWidth: number;
  imageHeight: number;
  face: FaceBox | null;
  outputWidth: number;
  outputHeight: number;
  headMin: number | null;
  headMax: number | null;
  crownGap: number;
}): AutoCropResult {
  const aspect = input.outputWidth / input.outputHeight;
  if (!input.face) {
    return { crop: centered(input.imageWidth, input.imageHeight, aspect), shrunk: false, usedFace: false };
  }
  const head = estimateHead(input.face);
  const target = input.headMin != null && input.headMax != null ? (input.headMin + input.headMax) / 2 : 0.62;
  const frameHeight = head.height / target;
  const frameWidth = frameHeight * aspect;
  const placed = place(
    head.centerX - frameWidth / 2,
    head.crown - input.crownGap * frameHeight,
    frameWidth,
    frameHeight,
    input.imageWidth,
    input.imageHeight,
  );
  return {
    crop: { x: placed.x, y: placed.y, width: placed.width, height: placed.height, rotation: 0 },
    shrunk: placed.shrunk,
    usedFace: true,
  };
}

export function scaleCrop(crop: CropWindow, factor: number, imageWidth: number, imageHeight: number): CropWindow {
  const aspect = crop.width / crop.height;
  const maxWidth = Math.min(imageWidth, imageHeight * aspect);
  const minWidth = Math.min(maxWidth, 32);
  const width = Math.min(Math.max(crop.width / factor, minWidth), maxWidth);
  const height = width / aspect;
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const placed = place(centerX - width / 2, centerY - height / 2, width, height, imageWidth, imageHeight);
  return { ...crop, x: placed.x, y: placed.y, width: placed.width, height: placed.height };
}

export function moveCrop(crop: CropWindow, dx: number, dy: number, imageWidth: number, imageHeight: number): CropWindow {
  const maxX = Math.max(0, imageWidth - crop.width);
  const maxY = Math.max(0, imageHeight - crop.height);
  return {
    ...crop,
    x: Math.min(Math.max(0, crop.x + dx), maxX),
    y: Math.min(Math.max(0, crop.y + dy), maxY),
  };
}
