"use client";

import { BLOG_POSTS } from "../data/blogPosts";
import { Link } from "../lib/navigation";
import { EcosystemSection } from "../components/layout/EcosystemSection";
import { useDocumentTitle } from "../hooks/useObjectUrl";

export function BlogIndexPage() {
  useDocumentTitle("Blog & Tutorials");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
          Resources & Tutorials
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Image Editing & Design Blog
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Master transparent PNG creation, e-commerce product clipping, profile picture design,
          and web image performance with practical, in-depth guides from the Solva team.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:border-brand/40 hover:shadow-card"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="rounded-md bg-paper px-2.5 py-1 font-semibold text-brand">
                  {post.category}
                </span>
                <span>{post.readTime}</span>
              </div>

              <h2 className="mt-4 text-xl font-bold leading-snug text-ink transition-colors group-hover:text-brand">
                <Link to={`/blog/${post.slug}`} className="focus:outline-none">
                  {post.title}
                </Link>
              </h2>

              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                {post.description}
              </p>
            </div>

            <div className="mt-6 border-t border-line/60 pt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{post.publishedAt}</span>
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand transition-transform group-hover:translate-x-1"
                >
                  Read guide <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-20 border-t border-line pt-12">
        <EcosystemSection />
      </div>
    </div>
  );
}

