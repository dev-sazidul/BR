import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

let objectUrl = 0;

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => {
    objectUrl += 1;
    return `blob:preview-${objectUrl}`;
  }),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});
