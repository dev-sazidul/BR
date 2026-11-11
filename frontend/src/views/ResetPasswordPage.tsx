"use client";

import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "../lib/navigation";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout } from "../components/account/AuthLayout";
import { PasswordField } from "../components/account/PasswordField";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Spinner } from "../components/common/Spinner";
import { readErrorMessage } from "../services/api";

declare global {
  interface Window {
    __solvaResetToken?: string;
  }
}

export function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth();
  const [params] = useSearchParams();
  const token =
    params.get("token") ||
    (typeof window === "undefined" ? "" : window.__solvaResetToken || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing information. Request a new one.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setMessage(await confirmPasswordReset({ token, password, confirmPassword: confirm }));
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" lede="This link works once. Your password is sent only in this form, not in the address bar.">
      {message ? (
        <p className="text-sm text-brand-dark">
          {message}{" "}
          <Link to="/sign-in" className="font-semibold text-brand">
            Sign in
          </Link>
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {error ? <ErrorBanner>{error}</ErrorBanner> : null}
          <PasswordField
            id="reset-password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordField
            id="reset-confirm"
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : null}
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
