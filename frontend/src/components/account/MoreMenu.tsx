import { MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { UserAvatar } from "./UserAvatar";

export function MoreMenu() {
  const { status, user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
        className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink hover:bg-paper"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">Account menu</span>
        <MoreVertical aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-card"
        >
          {user ? (
            <div className="flex items-center gap-2 px-2 py-2">
              <UserAvatar name={user.name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
            </div>
          ) : null}
          {status === "authenticated" && user ? (
            <button
              type="button"
              role="menuitem"
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-paper"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              Sign out
            </button>
          ) : null}
          {status === "anonymous" ? (
            <>
              <MenuLink to="/sign-in">Sign in</MenuLink>
              <MenuLink to="/register">Create account</MenuLink>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} role="menuitem" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-paper">
      {children}
    </Link>
  );
}
