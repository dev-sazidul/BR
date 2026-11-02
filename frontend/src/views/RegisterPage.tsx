"use client";

import { Link, useNavigate } from "../lib/navigation";

import { useAuth } from "../auth/AuthProvider";
import { AuthLayout } from "../components/account/AuthLayout";
import { RegisterForm } from "../components/account/RegisterForm";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      mode="register"
      title="Create a Solva account"
      lede={
        <>
          or{" "}
          <Link to="/sign-in" className="font-semibold text-brand hover:text-brand-dark">
            sign in
          </Link>{" "}
          if you already have one
        </>
      }
    >
      <RegisterForm
        onSubmit={async (input) => {
          await register(input);
          navigate("/");
        }}
      />
    </AuthLayout>
  );
}
