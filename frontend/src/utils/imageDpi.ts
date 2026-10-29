const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

export function pngWithDpi(png: Uint8Array, dpi: number): Uint8Array {
  const pixelsPerMetre = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  view.setUint32(0, pixelsPerMetre);
  view.setUint32(4, pixelsPerMetre);
  data[8] = 1;
  const chunk = pngChunk("pHYs", data);
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = new DataView(png.buffer, png.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(png[offset + 4], png[offset + 5], png[offset + 6], png[offset + 7]);
    if (type === "IDAT" || type === "IEND") {
      const next = new Uint8Array(png.length + chunk.length);
      next.set(png.subarray(0, offset), 0);
      next.set(chunk, offset);
      next.set(png.subarray(offset), offset + chunk.length);
      return next;
    }
    offset += 12 + length;
  }
  return png;
}

function jfifSegment(dpi: number): Uint8Array {
  const segment = new Uint8Array(18);
  segment[0] = 0xff;
  segment[1] = 0xe0;
  segment[2] = 0x00;
  segment[3] = 16;
  segment.set([0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 1], 4);
  const view = new DataView(segment.buffer);
  view.setUint16(12, dpi);
  view.setUint16(14, dpi);
  return segment;
}

export function jpegWithDpi(jpeg: Uint8Array, dpi: number): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0 && jpeg.length >= 20) {
    const name = String.fromCharCode(jpeg[6], jpeg[7], jpeg[8], jpeg[9], jpeg[10]);
    if (name === "JFIF\0") {
      const copy = jpeg.slice();
      copy[13] = 1;
      const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
      view.setUint16(14, dpi);
      view.setUint16(16, dpi);
      return copy;
    }
  }
  const segment = jfifSegment(dpi);
  const next = new Uint8Array(jpeg.length + segment.length);
  next.set(jpeg.subarray(0, 2), 0);
  next.set(segment, 2);
  next.set(jpeg.subarray(2), 2 + segment.length);
  return next;
}

function blobBytes(bytes: Uint8Array, type: string): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type });
}

export async function blobWithDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/png") return blobBytes(pngWithDpi(bytes, dpi), blob.type);
  if (blob.type === "image/jpeg") return blobBytes(jpegWithDpi(bytes, dpi), blob.type);
  return blob;
}
