import { createHash, randomBytes } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";

import type { User } from "../generated/prisma/client";
import { db } from "./db";
import { ApiError } from "./errors";
import { serverSettings } from "./settings";

const SESSION_COOKIE = "solva_session";
/** Not a secret. It only tells the page a session may exist, so guests skip /me. */
const SIGNED_IN_HINT_COOKIE = "solva_signed_in";

const PERSISTENT_SECONDS = 30 * 24 * 60 * 60;
const BROWSER_SESSION_SECONDS = 12 * 60 * 60;

export function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

type IssuedSession = { token: string; persistent: boolean; expiresAt: Date };

export async function createSession(userId: number, persistent: boolean): Promise<IssuedSession> {
  const token = newToken();
  const seconds = persistent ? PERSISTENT_SECONDS : BROWSER_SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + seconds * 1000);
  const prisma = db();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { id: digest(token), userId, persistent, expiresAt } });
  return { token, persistent, expiresAt };
}

export function setSessionCookies(response: NextResponse, session: IssuedSession): void {
  const secure = serverSettings().cookieSecure;
  // A browser session cookie (no Max-Age) when Remember me is off.
  const maxAge = session.persistent ? PERSISTENT_SECONDS : undefined;
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge });
  response.cookies.set(SIGNED_IN_HINT_COOKIE, "1", { httpOnly: false, sameSite: "lax", secure, path: "/", maxAge });
}

export function clearSessionCookies(response: NextResponse): void {
  for (const name of [SESSION_COOKIE, SIGNED_IN_HINT_COOKIE]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

type CurrentSession = { id: string; persistent: boolean; user: User };

export async function readSession(request: NextRequest): Promise<CurrentSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const prisma = db();
  const session = await prisma.session.findUnique({ where: { id: digest(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { id: session.id, persistent: session.persistent, user: session.user };
}

export async function requireSession(request: NextRequest): Promise<CurrentSession> {
  const session = await readSession(request);
  if (!session) {
    throw new ApiError("not_authenticated", "Sign in to continue.", 401);
  }
  return session;
}

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, date_joined: user.createdAt.toISOString() };
}
