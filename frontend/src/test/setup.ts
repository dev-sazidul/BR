import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", async () => {
  const { navigationState } = await import("./navigation-state");
  return {
    usePathname: () => navigationState.pathname,
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({
      push: (href: string) => {
        navigationState.pathname = href.split("?")[0] || "/";
      },
      replace: (href: string) => {
        navigationState.pathname = href.split("?")[0] || "/";
      },
      prefetch: () => Promise.resolve(),
    }),
  };
});

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function installStorage(name: "localStorage" | "sessionStorage", storage: Storage) {
  Object.defineProperty(globalThis, name, { configurable: true, value: storage });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, { configurable: true, value: storage });
  }
}

const currentLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
if (!currentLocalStorage || typeof currentLocalStorage.getItem !== "function") {
  installStorage("localStorage", memoryStorage());
  installStorage("sessionStorage", memoryStorage());
}

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
