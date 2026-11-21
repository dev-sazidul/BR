import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";
import { BLOG_POSTS, getBlogPost } from "../data/blogPosts";
import { resolvePageMeta, SITEMAP_PATHS } from "./metadata";
import { getSiteOrigin } from "./siteConfig";

const origin = "https://solva.example";

describe("SEO Blog Section and Sitemap", () => {
  it("contains exactly 6 comprehensive blog posts", () => {
    expect(BLOG_POSTS).toHaveLength(6);
  });

  it("ensures every blog post is at least 700 words (AdSense-safe & comprehensive)", () => {
    for (const post of BLOG_POSTS) {
      const words = post.content.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(700);
      expect(post.title.length).toBeGreaterThan(20);
      expect(post.description.length).toBeGreaterThan(50);
      expect(post.author.length).toBeGreaterThan(0);
      expect(post.readTime).toMatch(/min read/);
    }
  });

  it("ensures all blog posts contain contextual internal and external links", () => {
    for (const post of BLOG_POSTS) {
      // Must include internal tool link
      expect(post.content).toMatch(/\(\/(?:portrait|#remove)?\)/);

      // Must include sister site backlinks
      expect(post.content).toContain("https://bestconvert.site");
      expect(post.content).toContain("https://futuresolutionai.com");
      expect(post.content).toContain("https://bestdownloader.site");
    }
  });

  it("ensures /blog and all blog post URLs are indexable and return status 200", () => {
    const blogMeta = resolvePageMeta("/blog", origin);
    expect(blogMeta.status).toBe(200);
    expect(blogMeta.robots).toBe("index,follow");
    expect(blogMeta.canonical).toBe(`${origin}/blog`);

    for (const post of BLOG_POSTS) {
      const path = `/blog/${post.slug}`;
      const meta = resolvePageMeta(path, origin);
      expect(meta.status).toBe(200);
      expect(meta.robots).toBe("index,follow");
      expect(meta.canonical).toBe(`${origin}${path}`);
      expect(getBlogPost(post.slug)).toBeDefined();
    }
  });

  it("ensures /blog and all blog post URLs are automatically present in sitemap.xml", () => {
    const siteUrl = getSiteOrigin();
    const map = sitemap();
    const urls = map.map((entry) => entry.url);

    expect(urls).toContain(`${siteUrl}/blog`);
    for (const post of BLOG_POSTS) {
      expect(urls).toContain(`${siteUrl}/blog/${post.slug}`);
      expect(SITEMAP_PATHS).toContain(`/blog/${post.slug}`);
    }
  });
});

