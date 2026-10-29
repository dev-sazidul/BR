import type { ReactNode } from "react";

import { useAuth } from "../../auth/AuthProvider";
import { Spinner } from "../common/Spinner";
import { GuestAccess } from "./GuestAccess";

export function ProtectedAccountRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") {
    return (
      <p role="status" className="mx-auto flex w-full max-w-md items-center gap-2 px-5 py-16 text-sm text-muted">
        <Spinner />
        Checking your account…
      </p>
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
