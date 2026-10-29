const LOCAL_KEY = "solva.auth.token";
const SESSION_KEY = "solva.auth.session";

export function readToken(): string | null {
  return localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function tokenIsRemembered(): boolean {
  return Boolean(localStorage.getItem(LOCAL_KEY));
}

export function writeToken(token: string, remember: boolean): void {
  localStorage.removeItem(LOCAL_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  if (remember) localStorage.setItem(LOCAL_KEY, token);
  else sessionStorage.setItem(SESSION_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(LOCAL_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
