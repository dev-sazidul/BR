import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { MoreMenu } from "../account/MoreMenu";
import { UserAvatar } from "../account/UserAvatar";
import { buttonClass } from "../common/Button";

const links = [
  { href: "/#how-it-works", label: "How it works", id: "how-it-works" },
  { href: "/#features", label: "Features", id: "features" },
];

function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand" aria-hidden="true">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-paper border-r-transparent" />
      </span>
      Solva
    </span>
  );
}

export function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" aria-label="Solva, home" onClick={() => window.scrollTo({ top: 0 })}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex" aria-label="Primary">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          {links.map((link) => (
            <Link key={link.id} to={link.href} className="hover:text-ink" onClick={() => scrollToId(link.id)}>
              {link.label}
            </Link>
          ))}
          <Link to="/#remove" className={buttonClass()} onClick={() => scrollToId("remove")}>
            Remove background
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <span className="hidden max-w-40 items-center gap-2 sm:inline-flex">
              <UserAvatar name={user.name} />
              <span className="truncate text-sm font-medium">{user.name}</span>
            </span>
          ) : null}
          <MoreMenu />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-line md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="border-t border-line px-5 py-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <Link to="/" className="rounded-xl px-2 py-2 hover:bg-white">
              Home
            </Link>
            {links.map((link) => (
              <Link
                key={link.id}
                to={link.href}
                className="rounded-xl px-2 py-2 hover:bg-white"
                onClick={() => scrollToId(link.id)}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/#remove" className={buttonClass()} onClick={() => scrollToId("remove")}>
              Remove background
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
