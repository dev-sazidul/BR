import { api } from "./api";
import type { AuthSession, AuthUser } from "../types/auth";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const response = await api.post<AuthSession>("/api/v1/auth/register/", input);
  return response.data;
}

export async function loginAccount(email: string, password: string): Promise<AuthSession> {
  const response = await api.post<AuthSession>("/api/v1/auth/login/", { email, password });
  return response.data;
}

export async function logoutAccount(): Promise<void> {
  await api.post("/api/v1/auth/logout/");
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/api/v1/auth/me/");
  return response.data;
}

export async function updateAccountName(name: string): Promise<AuthUser> {
  const response = await api.patch<AuthUser>("/api/v1/auth/me/", { name });
  return response.data;
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<AuthSession> {
  const response = await api.post<AuthSession>("/api/v1/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete("/api/v1/auth/me/", { data: { password } });
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await api.post<{ message: string }>("/api/v1/auth/password-reset/", { email });
  return response.data.message;
}

export async function confirmPasswordReset(input: {
  uid: string;
  token: string;
  password: string;
  confirm_password: string;
}): Promise<string> {
  const response = await api.post<{ message: string }>("/api/v1/auth/password-reset/confirm/", input);
  return response.data.message;
}
