"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { getBlogPost } from "../data/blogPosts";
import { Link } from "../lib/navigation";
import { EcosystemSection } from "../components/layout/EcosystemSection";
import { useDocumentTitle } from "../hooks/useObjectUrl";
import { NotFoundPage } from "./NotFoundPage";

function parseInline(text: string): ReactNode[] {
  // Regex matches: [text](url), **bold**, `code`, *italic*
  const pattern = /(!?\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const linkText = match[2];
    const linkUrl = match[3];
    const boldText = match[4];
    const codeText = match[5];
    const italicText = match[6];

    if (linkText && linkUrl) {
      const isExternal = linkUrl.startsWith("http://") || linkUrl.startsWith("https://");
      if (isExternal) {
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:text-brand-dark hover:decoration-brand"
          >
            {linkText}
          </a>,
        );
      } else {
        parts.push(
          <Link
            key={match.index}
            to={linkUrl}
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:text-brand-dark hover:decoration-brand"
          >
            {linkText}
          </Link>,
        );
      }
    } else if (boldText) {
      parts.push(
        <strong key={match.index} className="font-semibold text-ink">
          {boldText}
        </strong>,
      );
    } else if (codeText) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-paper px-1.5 py-0.5 font-mono text-[13px] text-brand"
        >
          {codeText}
        </code>,
      );
    } else if (italicText) {
      parts.push(
        <em key={match.index} className="italic">
          {italicText}
        </em>,
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const rawBlocks = content.trim().split(/\n\s*\n/);
    return rawBlocks.map((raw, idx) => {
      const block = raw.trim();

      if (block.startsWith("### ")) {
        return (
          <h3
            key={idx}
            className="mt-8 text-xl font-bold tracking-tight text-ink first:mt-0"
          >
            {parseInline(block.replace(/^###\s+/, ""))}
          </h3>
        );
      }

      if (block.startsWith("## ")) {
        return (
          <h2
            key={idx}
            className="mt-10 border-b border-line/60 pb-2 text-2xl font-bold tracking-tight text-ink first:mt-0"
          >
            {parseInline(block.replace(/^##\s+/, ""))}
          </h2>
        );
      }

      if (block === "---") {
        return <hr key={idx} className="my-8 border-line" />;
      }

      // Checklists: - [ ] or - [x]
      if (block.includes("- [ ]") || block.includes("- [x]")) {
        const lines = block.split("\n");
        return (
          <ul key={idx} className="my-4 space-y-2">
            {lines.map((line, lIdx) => {
              const isChecked = line.includes("- [x]");
              const text = line.replace(/^-\s*\[[ x]\]\s*/, "");
              return (
                <li key={lIdx} className="flex items-start gap-2.5 text-sm text-ink/90">
                  <input
                    type="checkbox"
                    readOnly
                    checked={isChecked}
                    className="mt-1 h-4 w-4 rounded border-line text-brand accent-brand"
                  />
                  <span>{parseInline(text)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      // Unordered list
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const lines = block.split("\n");
        return (
          <ul key={idx} className="my-4 list-disc space-y-2 pl-6 text-base text-ink/80">
            {lines.map((line, lIdx) => (
              <li key={lIdx}>{parseInline(line.replace(/^[-*]\s+/, ""))}</li>
            ))}
          </ul>
        );
      }

      // Ordered list
      if (/^\d+\.\s+/.test(block)) {
        const lines = block.split("\n");
        return (
          <ol key={idx} className="my-4 list-decimal space-y-2 pl-6 text-base text-ink/80">
            {lines.map((line, lIdx) => (
              <li key={lIdx}>{parseInline(line.replace(/^\d+\.\s+/, ""))}</li>
            ))}
          </ol>
        );
      }

      // Tables
      if (block.startsWith("|") && block.includes("\n|")) {
        const rows = block.split("\n").filter((r) => r.trim().startsWith("|"));
        if (rows.length >= 2) {
          const headerCells = rows[0]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          const dataRows = rows.slice(2); // Skip separator row
          return (
            <div key={idx} className="my-6 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper text-ink">
                  <tr>
                    {headerCells.map((cell, cIdx) => (
                      <th key={cIdx} className="px-4 py-3 font-semibold">
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 bg-white">
                  {dataRows.map((row, rIdx) => {
                    const cells = row
                      .split("|")
                      .slice(1, -1)
                      .map((c) => c.trim());
                    return (
                      <tr key={rIdx} className="hover:bg-paper/40">
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 text-ink/80">
                            {parseInline(cell)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Code blocks
      if (block.startsWith("```")) {
        const lines = block.split("\n");
        const code = lines.slice(1, -1).join("\n");
        return (
          <pre
            key={idx}
            className="my-5 overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs text-paper"
          >
            <code>{code}</code>
          </pre>
        );
      }

      // Regular paragraph
      return (
        <p key={idx} className="my-4 text-base leading-7 text-ink/80">
          {parseInline(block)}
        </p>
      );
    });
  }, [content]);

  return <div className="blog-prose">{blocks}</div>;
}

export function BlogPostPage({ slug }: { slug: string }) {
  const post = getBlogPost(slug);
  useDocumentTitle(post ? post.title : "Article not found");

  if (!post) {
    return <NotFoundPage />;
  }

  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-xs text-muted">
          <li>
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/blog" className="hover:text-ink">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-xs truncate font-medium text-ink sm:max-w-md" aria-current="page">
            {post.title}
          </li>
        </ol>
      </nav>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="rounded-md bg-brand/10 px-2.5 py-1 font-semibold text-brand">
            {post.category}
          </span>
          <span>•</span>
          <time dateTime={post.publishedAt}>{post.publishedAt}</time>
          <span>•</span>
          <span>{post.readTime}</span>
          <span>•</span>
          <span>By {post.author}</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-muted">
          {post.description}
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-10 shadow-sm">
        <MarkdownRenderer content={post.content} />
      </div>

      <div className="my-10 rounded-2xl border border-brand/30 bg-brand/5 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-ink">Try Solva Background Remover Free</h3>
        <p className="mt-2 text-sm text-muted">
          Upload any photo to generate instant, lossless transparent PNG cutouts in seconds. No signup or credit card required.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/#remove"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            Remove Background Now
          </Link>
          <Link
            to="/portrait"
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-paper"
          >
            Create Passport & Avatar Photo
          </Link>
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-12">
        <EcosystemSection />
      </div>
    </article>
  );
}

