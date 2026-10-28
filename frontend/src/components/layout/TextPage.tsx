import type { ReactNode } from "react";

import { useDocumentTitle } from "../../hooks/useObjectUrl";

export function TextPage({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle(title);
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 space-y-4 text-base leading-7 text-muted">{children}</div>
    </article>
  );
}
