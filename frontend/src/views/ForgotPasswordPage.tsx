"use client";

import { FormEvent, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout, fieldClass, FieldLabel } from "../components/account/AuthLayout";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Spinner } from "../components/common/Spinner";
import { readErrorMessage } from "../services/api";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setMessage(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Forgot password" lede="We will email a reset link if an account exists for this address.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {message ? <p className="text-sm text-brand-dark">{message}</p> : null}
        <div>
          <FieldLabel htmlFor="reset-email">Email address</FieldLabel>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null}
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
