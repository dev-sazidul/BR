import { Link } from "../../lib/navigation";

import { buttonClass } from "../common/Button";
import { AuthLayout } from "./AuthLayout";

export function GuestAccess({ title, body }: { title: string; body: string }) {
  return (
    <AuthLayout title={title} lede={body}>
      <p className="text-sm leading-6 text-muted">
        You can keep removing backgrounds without an account. Sign in only if you want a profile on this server.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/sign-in" className={buttonClass()}>
          Sign in
        </Link>
        <Link to="/register" className={buttonClass("secondary")}>
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
