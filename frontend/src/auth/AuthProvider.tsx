import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
import { clearToken, readToken, tokenIsRemembered, writeToken } from "./storage";

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
  confirmPasswordReset: (input: {
    uid: string;
    token: string;
    password: string;
    confirmPassword: string;
  }) => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(readToken() ? "loading" : "anonymous");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = readToken();
    if (!token) {
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
        clearToken();
        setUser(null);
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const session = await loginAccount(email, password);
    writeToken(session.token, remember);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await registerAccount(input);
    writeToken(session.token, true);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (readToken()) await logoutAccount();
    } finally {
      clearToken();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    const next = await updateAccountName(name);
    setUser(next);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      const session = await changeAccountPassword(currentPassword, newPassword, confirmPassword);
      writeToken(session.token, tokenIsRemembered());
      setUser(session.user);
    },
    [],
  );

  const removeAccount = useCallback(async (password: string) => {
    await deleteAccount(password);
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const sendReset = useCallback(async (email: string) => requestPasswordReset(email), []);

  const finishReset = useCallback(
    async (input: { uid: string; token: string; password: string; confirmPassword: string }) =>
      confirmPasswordReset({
        uid: input.uid,
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
    [
      status,
      user,
      signIn,
      register,
      signOut,
      updateProfile,
      changePassword,
      removeAccount,
      sendReset,
      finishReset,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
