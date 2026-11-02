import { describe, expect, it } from "vitest";

import { formatDocumentTitle, resolvePageMeta, SITEMAP_PATHS } from "./metadata";

const origin = "https://solva.example";

describe("route metadata", () => {
  it("keeps the existing home title", () => {
    expect(formatDocumentTitle("Home")).toBe("Solva — Remove Image Backgrounds");
    expect(resolvePageMeta("/", origin).title).toBe("Solva — Remove Image Backgrounds");
  });

  it("gives every indexable route a unique title, description, and canonical URL", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of SITEMAP_PATHS) {
      const meta = resolvePageMeta(path, origin);
      expect(meta.status).toBe(200);
      expect(meta.robots).toBe("index,follow");
      expect(meta.canonical).toBe(`${origin}${path === "/" ? "/" : path}`);
      expect(meta.description.length).toBeGreaterThan(40);
      expect(titles.has(meta.title)).toBe(false);
      expect(descriptions.has(meta.description)).toBe(false);
      titles.add(meta.title);
      descriptions.add(meta.description);
      expect(JSON.stringify(meta.jsonLd)).toContain("https://schema.org");
    }
  });

  it("keeps private routes out of the sitemap and marks unknown URLs as 404", () => {
    expect(SITEMAP_PATHS).not.toContain("/profile");
    expect(SITEMAP_PATHS).not.toContain("/account");
    expect(SITEMAP_PATHS).not.toContain("/reset-password");
    expect(resolvePageMeta("/profile", origin).robots).toBe("noindex,nofollow");
    expect(resolvePageMeta("/missing", origin).status).toBe(404);
    expect(resolvePageMeta("/about/", origin).canonical).toBe(`${origin}/about`);
  });
});
