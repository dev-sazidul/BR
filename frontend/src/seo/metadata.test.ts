import { afterEach, describe, expect, it, vi } from "vitest";

import { BLOG_POSTS } from "../data/blogPosts";
import { formatDocumentTitle, resolvePageMeta, SITEMAP_PATHS } from "./metadata";
import { DEFAULT_LOCAL_URL, DEFAULT_PRODUCTION_URL, getSiteOrigin } from "./siteConfig";

const origin = "https://solva.example";

describe("route metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("indexes /blog and all 6 SEO blog posts in sitemap paths", () => {
    expect(SITEMAP_PATHS).toContain("/blog");
    expect(BLOG_POSTS).toHaveLength(6);
    for (const post of BLOG_POSTS) {
      const path = `/blog/${post.slug}`;
      expect(SITEMAP_PATHS).toContain(path);
      const meta = resolvePageMeta(path, origin);
      expect(meta.status).toBe(200);
      expect(meta.robots).toBe("index,follow");
      expect(meta.canonical).toBe(`${origin}${path}`);
      expect(JSON.stringify(meta.jsonLd)).toContain("BlogPosting");
      expect(JSON.stringify(meta.jsonLd)).toContain("FutureSolutionAI");
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

  it("resolves site origin with environment variable or clean fallbacks", () => {
    vi.stubEnv("SITE_URL", "https://custom-domain.example/");
    expect(getSiteOrigin()).toBe("https://custom-domain.example");

    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getSiteOrigin()).toBe(DEFAULT_PRODUCTION_URL);

    vi.stubEnv("NODE_ENV", "development");
    expect(getSiteOrigin()).toBe(DEFAULT_LOCAL_URL);
  });
});
