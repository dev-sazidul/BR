"use client";

import { Link } from "../lib/navigation";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout } from "../components/account/AuthLayout";
import { GuestAccess } from "../components/account/GuestAccess";
import { UserAvatar } from "../components/account/UserAvatar";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";

export function ProfilePage() {
  const { status, user, signOut } = useAuth();

  if (status === "loading") {
    return (
      <section className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="sr-only">Profile</h1>
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
        title="Profile"
        body="You are using Solva as a guest. Sign in if you want this server to remember your name."
      />
    );
  }

  const joined = new Date(user.date_joined).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AuthLayout title="Profile" wide>
      <div className="flex items-center gap-4">
        <UserAvatar name={user.name} large />
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium">Name</dt>
          <dd className="text-muted">{user.name}</dd>
        </div>
        <div>
          <dt className="font-medium">Email</dt>
          <dd className="text-muted">{user.email}</dd>
        </div>
        <div>
          <dt className="font-medium">Account created</dt>
          <dd className="text-muted">{joined}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/account"
          className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Edit profile
        </Link>
        <Link
          to="/account"
          className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-paper"
        >
          Account settings
        </Link>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}
