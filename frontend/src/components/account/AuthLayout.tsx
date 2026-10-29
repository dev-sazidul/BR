import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useDocumentTitle } from "../../hooks/useObjectUrl";

type AuthMode = "sign-in" | "register";

export function AuthLayout({
  title,
  lede,
  children,
  wide = false,
  mode,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  mode?: AuthMode;
}) {
  useDocumentTitle(title);
  const tabbed = mode !== undefined;

  return (
    <section className={`mx-auto w-full px-5 py-12 sm:py-16 ${wide && !tabbed ? "max-w-xl" : "max-w-lg"}`}>
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {lede ? <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{lede}</p> : null}
      </div>

      {tabbed ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left text-sm leading-6 text-muted">
          <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand" aria-hidden="true">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-paper border-r-transparent" />
          </span>
          <p>An account is optional. You can remove a background, preview it, and download it without signing in.</p>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        {tabbed ? <AuthTabs mode={mode} /> : null}
        <div className="p-6 sm:p-8">{children}</div>
      </div>

      <Link to="/" className="mt-6 block text-center text-sm font-semibold text-brand hover:text-brand-dark">
        Back to Background Remover
      </Link>
    </section>
  );
}

function AuthTabs({ mode }: { mode: AuthMode }) {
  return (
    <div className="grid grid-cols-2 border-b border-line text-sm font-semibold">
      <Tab to="/sign-in" active={mode === "sign-in"}>
        Sign in
      </Tab>
      <Tab to="/register" active={mode === "register"}>
        Create account
      </Tab>
    </div>
  );
}

function Tab({ to, active, children }: { to: string; active: boolean; children: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`px-4 py-4 text-center ${
        active ? "bg-white text-ink" : "bg-paper text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export const fieldClass =
  "mt-1.5 w-full rounded-lg border border-[#cfc8be] bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
      {children}
    </label>
  );
}
