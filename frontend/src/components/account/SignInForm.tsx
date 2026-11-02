import { FormEvent, useState } from "react";
import { Link } from "../../lib/navigation";

import { readErrorMessage } from "../../services/api";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import { fieldClass, FieldLabel } from "./AuthLayout";
import { PasswordField } from "./PasswordField";

type SignInValues = {
  email: string;
  password: string;
  remember: boolean;
};

export function SignInForm({ onSubmit }: { onSubmit: (values: SignInValues) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), password, remember });
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <div>
        <FieldLabel htmlFor="sign-in-email">Email address</FieldLabel>
        <input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
      </div>
      <PasswordField
        id="sign-in-password"
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Remember me
        </label>
        <Link to="/forgot-password" className="font-semibold text-brand hover:text-brand-dark">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" className="w-full rounded-lg" disabled={busy}>
        {busy ? <Spinner /> : null}
        Sign in
      </Button>
    </form>
  );
}
