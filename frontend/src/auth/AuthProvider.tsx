import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  changeAccountPassword,
  confirmPasswordReset,
  deleteAccount,
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
  updateAccountName,
  type RegisterInput,
} from "../services/authService";
import type { AuthUser } from "../types/auth";
import { useIsomorphicLayoutEffect } from "../utils/isomorphicLayoutEffect";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  removeAccount: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  confirmPasswordReset: (input: { token: string; password: string; confirmPassword: string }) => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The session cookie is httpOnly, so scripts cannot read it. The server also
 * sets a plain "solva_signed_in" hint, which lets guests skip the /me request.
 */
function mightBeSignedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim().startsWith("solva_signed_in="));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!mightBeSignedIn()) {
      setStatus("anonymous");
      setUser(null);
      return;
    }
    let active = true;
    setStatus("loading");
    fetchCurrentUser()
      .then((current) => {
        if (!active) return;
        setUser(current);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const session = await loginAccount(email, password, remember);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await registerAccount(input);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    setUser(await updateAccountName(name));
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const session = await changeAccountPassword(currentPassword, newPassword, confirmPassword);
      setUser(session.user);
    },
    [],
  );

  const removeAccount = useCallback(async (password: string) => {
    await deleteAccount(password);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const sendReset = useCallback(async (email: string) => requestPasswordReset(email), []);

  const finishReset = useCallback(
    async (input: { token: string; password: string; confirmPassword: string }) =>
      confirmPasswordReset({
        token: input.token,
        password: input.password,
        confirm_password: input.confirmPassword,
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn,
      register,
      signOut,
      updateProfile,
      changePassword,
      removeAccount,
      requestPasswordReset: sendReset,
      confirmPasswordReset: finishReset,
    }),
    [status, user, signIn, register, signOut, updateProfile, changePassword, removeAccount, sendReset, finishReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
