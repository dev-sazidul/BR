import { ChevronDown, Download, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "../../lib/navigation";

import { useAuth } from "../../auth/AuthProvider";
import { cn } from "../../utils/cn";
import { MoreMenu } from "../account/MoreMenu";
import { UserAvatar } from "../account/UserAvatar";

const links = [
  { href: "/#remove", label: "Remove background", id: "remove", hash: true },
  { href: "/portrait", label: "Portraits", id: "portrait", hash: false },
  { href: "/#how-it-works", label: "How it works", id: "how-it-works", hash: true },
  { href: "/#features", label: "Features", id: "features", hash: true },
];

const moreLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function navLinkClass(active: boolean) {
  return cn(
    "text-[13px] font-semibold uppercase tracking-wide",
    active ? "text-brand" : "text-ink/70 hover:text-ink",
  );
}

function Logo() {
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
  const section = location.pathname === "/" ? location.hash.replace("#", "") : "";
  const activeId =
    location.pathname === "/portrait"
      ? "portrait"
      : section === "how-it-works" || section === "features"
        ? section
        : location.pathname === "/"
          ? "remove"
          : "";

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
    <header className="sticky top-0 z-20 border-b border-line bg-white pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-full min-w-0 items-center gap-2 px-3 sm:gap-6 sm:px-6">
        <Link to="/" aria-label="Solva, home" className="shrink-0" onClick={() => window.scrollTo({ top: 0 })}>
          <Logo />
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.id}
              to={link.href}
              className={navLinkClass(activeId === link.id)}
              aria-current={activeId === link.id ? "page" : undefined}
              onClick={() => {
                if (link.hash) scrollToId(link.id);
              }}
            >
              {link.label}
            </Link>
          ))}
          <MorePages active={moreLinks.some((link) => location.pathname === link.href)} />
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            to="/apps"
            aria-label="Apps Download"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 hover:text-ink"
          >
            <Download aria-hidden="true" size={16} />
            <span className="hidden sm:inline">Apps Download</span>
          </Link>
          {user ? (
            <span className="hidden items-center gap-2 sm:inline-flex">
              <UserAvatar name={user.name} />
              <span className="max-w-36 truncate text-sm font-medium">{user.name}</span>
            </span>
          ) : (
            <>
              <Link to="/sign-in" className="hidden text-sm font-medium text-ink/80 hover:text-ink sm:inline">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark sm:px-4"
              >
                Sign up
              </Link>
            </>
          )}
          <MoreMenu />
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-ink hover:bg-paper lg:hidden"
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
        <nav id="mobile-nav" className="border-t border-line px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1 text-[13px] font-semibold uppercase tracking-wide">
            {links.map((link) => (
              <Link
                key={link.id}
                to={link.href}
                className={cn("rounded-md px-2 py-2", activeId === link.id ? "text-brand" : "text-ink/80")}
                onClick={() => {
                  if (link.hash) scrollToId(link.id);
                }}
              >
                {link.label}
              </Link>
            ))}
            {moreLinks.map((link) => (
              <Link key={link.href} to={link.href} className="rounded-md px-2 py-2 text-ink/80">
                {link.label}
              </Link>
            ))}
            <Link to="/apps" className="rounded-md px-2 py-2 text-ink/80">
              Apps Download
            </Link>
            {user ? null : (
              <Link to="/sign-in" className="rounded-md px-2 py-2 text-ink/80 sm:hidden">
                Login
              </Link>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MorePages({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(navLinkClass(active), "inline-flex items-center gap-1")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        More
        <ChevronDown aria-hidden="true" size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="More pages"
          className="absolute left-0 z-30 mt-2 w-44 rounded-xl border border-line bg-white p-1 shadow-card"
        >
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm font-medium normal-case tracking-normal text-ink hover:bg-paper"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
