import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout, fieldClass, FieldLabel } from "../components/account/AuthLayout";
import { PasswordField } from "../components/account/PasswordField";
import { ProtectedAccountRoute } from "../components/account/ProtectedAccountRoute";
import { Button } from "../components/common/Button";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { Spinner } from "../components/common/Spinner";
import { readErrorMessage } from "../services/api";

export function AccountSettingsPage() {
  return (
    <ProtectedAccountRoute>
      <SettingsForm />
    </ProtectedAccountRoute>
  );
}

function SettingsForm() {
  const { user, updateProfile, changePassword, removeAccount, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await updateProfile(name.trim());
      setProfileMessage("Name updated.");
    } catch (err) {
      setProfileError(await readErrorMessage(err));
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated. You are still signed in on this device.");
    } catch (err) {
      setPasswordError(await readErrorMessage(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function confirmDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await removeAccount(deletePassword);
    } catch (err) {
      setDeleteError(await readErrorMessage(err));
      setDeleteBusy(false);
    }
  }

  return (
    <AuthLayout title="Account settings" wide lede="These settings apply only to your account, not to guest uploads.">
      <form className="space-y-4" onSubmit={saveName}>
        <h2 className="text-lg font-semibold">Profile</h2>
        {profileError ? <ErrorBanner>{profileError}</ErrorBanner> : null}
        {profileMessage ? <p className="text-sm text-brand-dark">{profileMessage}</p> : null}
        <div>
          <FieldLabel htmlFor="account-name">Full name</FieldLabel>
          <input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
            required
          />
        </div>
        <p className="text-sm text-muted">Email stays {user?.email}. It is the address you sign in with.</p>
        <Button type="submit" disabled={profileBusy}>
          {profileBusy ? <Spinner /> : null}
          Save name
        </Button>
      </form>

      <form className="mt-8 space-y-4 border-t border-line pt-8" onSubmit={savePassword}>
        <h2 className="text-lg font-semibold">Security</h2>
        {passwordError ? <ErrorBanner>{passwordError}</ErrorBanner> : null}
        {passwordMessage ? <p className="text-sm text-brand-dark">{passwordMessage}</p> : null}
        <PasswordField
          id="current-password"
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <PasswordField
          id="confirm-new-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={passwordBusy}>
            {passwordBusy ? <Spinner /> : null}
            Change password
          </Button>
          <Link to="/forgot-password" className="self-center text-sm font-semibold text-brand hover:text-brand-dark">
            Forgot password
          </Link>
        </div>
        <Button variant="ghost" type="button" onClick={() => void signOut()}>
          Sign out
        </Button>
      </form>

      <section className="mt-8 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Delete account</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Deleting removes your name, email, and password from this server. It does not remove images, because
          uploads are not saved on your account. You can still use Solva as a guest afterward. This cannot be undone.
        </p>
        {deleteOpen ? (
          <form className="mt-4 space-y-4" onSubmit={confirmDelete}>
            {deleteError ? <ErrorBanner>{deleteError}</ErrorBanner> : null}
            <PasswordField
              id="delete-password"
              label="Password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              required
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={deleteBusy} className="bg-red-800 hover:bg-red-900">
                {deleteBusy ? <Spinner /> : null}
                Delete account
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="secondary" className="mt-4" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        )}
      </section>
    </AuthLayout>
  );
}
