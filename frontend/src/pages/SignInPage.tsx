import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout } from "../components/account/AuthLayout";
import { SignInForm } from "../components/account/SignInForm";

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      mode="sign-in"
      title="Sign in to Solva"
      lede={
        <>
          or{" "}
          <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
            create an account
          </Link>{" "}
          for free
        </>
      }
    >
      <SignInForm
        onSubmit={async ({ email, password, remember }) => {
          await signIn(email, password, remember);
          navigate("/");
        }}
      />
    </AuthLayout>
  );
}
