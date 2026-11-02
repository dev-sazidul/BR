import { FormEvent, useState } from "react";
import { Link } from "../../lib/navigation";

import { readErrorMessage } from "../../services/api";
import type { RegisterInput } from "../../services/authService";
import { Button } from "../common/Button";
import { ErrorBanner } from "../common/ErrorBanner";
import { Spinner } from "../common/Spinner";
import { fieldClass, FieldLabel } from "./AuthLayout";
import { PASSWORD_RULES, PasswordField } from "./PasswordField";

export function RegisterForm({ onSubmit }: { onSubmit: (input: RegisterInput) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        confirm_password: confirm,
      });
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
        <FieldLabel htmlFor="register-name">Full name</FieldLabel>
        <input
          id="register-name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <FieldLabel htmlFor="register-email">Email address</FieldLabel>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
      </div>
      <PasswordField
        id="register-password"
        label="Password (8 characters minimum)"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordField
        id="register-confirm"
        label="Confirm password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <label className="flex items-start gap-2 text-sm leading-6 text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1 h-4 w-4 accent-brand"
        />
        <span>
          I agree to the{" "}
          <Link to="/terms" className="font-semibold text-brand hover:text-brand-dark">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-brand hover:text-brand-dark">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Button type="submit" className="w-full rounded-lg" disabled={busy}>
        {busy ? <Spinner /> : null}
        Create account
      </Button>
    </form>
  );
}
