import { describe, expect, it } from "vitest";

import { validateClientFile } from "./validateFile";

function file(name: string, type: string, size: number): File {
  const blob = new File([new Uint8Array(size)], name, { type });
  return blob;
}

describe("validateClientFile", () => {
  it("accepts png, jpeg, and webp", () => {
    expect(validateClientFile(file("photo.png", "image/png", 10), 1000)).toBeNull();
    expect(validateClientFile(file("photo.jpg", "image/jpeg", 10), 1000)).toBeNull();
    expect(validateClientFile(file("photo.webp", "", 10), 1000)).toBeNull();
  });

  it("rejects the wrong type, an empty file, and a file over the limit", () => {
    expect(validateClientFile(file("notes.txt", "text/plain", 10), 1000)).toMatch(/PNG, JPG, or WebP/);
    expect(validateClientFile(file("empty.png", "image/png", 0), 1000)).toMatch(/empty/);
    expect(validateClientFile(file("big.png", "image/png", 2000), 1000)).toMatch(/limit/);
  });
});
