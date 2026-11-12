import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const brand = [15, 110, 107, 255];
const paper = [244, 241, 234, 255];
const ink = [31, 26, 23, 255];
const muted = [92, 85, 78, 255];

const font = {
  S: ["01110", "10001", "10000", "01110", "00001", "10001", "01110"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  l: ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  R: ["01110", "10001", "10001", "01110", "10100", "10010", "10001"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10001", "10001"],
  i: ["00100", "00000", "00100", "00100", "00100", "00100", "00100"],
  g: ["00000", "00000", "01111", "10001", "01111", "00001", "01110"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  n: ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  u: ["00000", "00000", "10001", "10001", "10001", "10001", "01110"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function rounded(x, y, size, radius) {
  const px = x + 0.5;
  const py = y + 0.5;
  const left = px < radius;
  const right = px > size - radius;
  const top = py < radius;
  const bottom = py > size - radius;
  if ((left || right) && (top || bottom)) {
    const cx = left ? radius : size - radius;
    const cy = top ? radius : size - radius;
    return Math.max(0, Math.min(1, radius + 0.5 - Math.hypot(px - cx, py - cy)));
  }
  return px >= 0 && py >= 0 && px <= size && py <= size ? 1 : 0;
}

function ring(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.22;
  const width = size * 0.075;
  const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const cover = Math.max(0, Math.min(1, width / 2 + 0.75 - Math.abs(dist - radius)));
  const angle = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
  const gap = Math.abs(angle) < 0.85;
  return gap ? 0 : cover;
}

function blend(base, color, amount) {
  const out = base.slice();
  out[0] = Math.round(base[0] * (1 - amount) + color[0] * amount);
  out[1] = Math.round(base[1] * (1 - amount) + color[1] * amount);
  out[2] = Math.round(base[2] * (1 - amount) + color[2] * amount);
  out[3] = Math.round(base[3] * (1 - amount) + color[3] * amount);
  return out;
}

function icon(size, maskable) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const background = maskable ? 1 : rounded(x, y, size, size * 0.25);
      let color = [0, 0, 0, 0];
      if (background > 0) color = blend(color, brand, background);
      const mark = ring(x, y, size) * (maskable ? 1 : background);
      if (mark > 0) color = blend(color, paper, mark);
      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return pixels;
}

function fill(pixels, width, height, color) {
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = color[0];
    pixels[i * 4 + 1] = color[1];
    pixels[i * 4 + 2] = color[2];
    pixels[i * 4 + 3] = color[3];
  }
}

function blit(target, width, source, sourceSize, x, y, scale) {
  const dest = Math.round(sourceSize * scale);
  for (let dy = 0; dy < dest; dy += 1) {
    for (let dx = 0; dx < dest; dx += 1) {
      const sx = Math.min(sourceSize - 1, Math.floor(dx / scale));
      const sy = Math.min(sourceSize - 1, Math.floor(dy / scale));
      const sample = (sy * sourceSize + sx) * 4;
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= width) continue;
      const offset = (ty * width + tx) * 4;
      const alpha = source[sample + 3] / 255;
      if (alpha <= 0) continue;
      target[offset] = Math.round(source[sample] * alpha + target[offset] * (1 - alpha));
      target[offset + 1] = Math.round(source[sample + 1] * alpha + target[offset + 1] * (1 - alpha));
      target[offset + 2] = Math.round(source[sample + 2] * alpha + target[offset + 2] * (1 - alpha));
      target[offset + 3] = 255;
    }
  }
}

function text(target, width, value, x, y, scale, color) {
  let cursor = x;
  for (const char of value) {
    const rows = font[char] ?? font[" "];
    for (let row = 0; row < rows.length; row += 1) {
      for (let col = 0; col < rows[row].length; col += 1) {
        if (rows[row][col] !== "1") continue;
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) {
            const offset = ((y + row * scale + py) * width + cursor + col * scale + px) * 4;
            target[offset] = color[0];
            target[offset + 1] = color[1];
            target[offset + 2] = color[2];
            target[offset + 3] = 255;
          }
        }
      }
    }
    cursor += 6 * scale;
  }
}

function textWidth(value, scale) {
  return value.length * 6 * scale - scale;
}

function splash(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  fill(pixels, width, height, paper);
  const mark = icon(256, false);
  const scale = Math.max(1, Math.round(Math.min(width, height) / 700));
  const markSize = 256 * scale;
  const title = "Solva";
  const subtitle = "Remove image backgrounds";
  const titleScale = Math.max(3, Math.round(Math.min(width, height) / 90));
  const subScale = Math.max(2, Math.round(titleScale * 0.45));
  const gap = titleScale * 3;
  const block = markSize + gap + titleScale * 7 + gap + subScale * 7;
  let y = Math.max(gap, Math.round((height - block) / 2));
  blit(pixels, width, mark, 256, Math.round((width - markSize) / 2), y, scale);
  y += markSize + gap;
  text(pixels, width, title, Math.round((width - textWidth(title, titleScale)) / 2), y, titleScale, ink);
  y += titleScale * 7 + gap;
  text(pixels, width, subtitle, Math.round((width - textWidth(subtitle, subScale)) / 2), y, subScale, muted);
  return pixels;
}

function write(path, width, height, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png(width, height, pixels));
  console.log(path);
}

const icons = join(root, "icons");
write(join(icons, "icon-192.png"), 192, 192, icon(192, false));
write(join(icons, "icon-512.png"), 512, 512, icon(512, false));
write(join(icons, "icon-maskable-192.png"), 192, 192, icon(192, true));
write(join(icons, "icon-maskable-512.png"), 512, 512, icon(512, true));
write(join(root, "apple-touch-icon.png"), 180, 180, icon(180, false));
write(join(icons, "screenshot-wide.png"), 1280, 720, splash(1280, 720));
write(join(icons, "screenshot-narrow.png"), 750, 1334, splash(750, 1334));
write(join(icons, "splash-1170x2532.png"), 1170, 2532, splash(1170, 2532));
write(join(icons, "splash-1284x2778.png"), 1284, 2778, splash(1284, 2778));
write(join(icons, "splash-2048x2732.png"), 2048, 2732, splash(2048, 2732));
