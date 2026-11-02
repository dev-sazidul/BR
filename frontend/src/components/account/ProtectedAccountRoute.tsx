import type { ReactNode } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { Spinner } from "../common/Spinner";
import { GuestAccess } from "./GuestAccess";

export function ProtectedAccountRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return (
      <section className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="sr-only">Account settings</h1>
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Checking your account…
        </p>
      </section>
    );
  }
  if (!user) {
    return (
      <GuestAccess
        title="Account settings"
        body="Sign in to update your name, change your password, or delete your account."
      />
    );
  }
  return children;
}
