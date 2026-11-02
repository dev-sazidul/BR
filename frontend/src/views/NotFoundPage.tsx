"use client";

import { Link } from "../lib/navigation";

import { useDocumentTitle } from "../hooks/useObjectUrl";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">That page is not part of Solva.</p>
      <Link to="/" className="mt-6 inline-flex font-semibold text-brand">
        Back to the uploader
      </Link>
    </section>
  );
}
