// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as changePassword from "../../app/api/v1/auth/change-password/route";
import * as login from "../../app/api/v1/auth/login/route";
import * as logout from "../../app/api/v1/auth/logout/route";
import * as me from "../../app/api/v1/auth/me/route";
import * as resetConfirm from "../../app/api/v1/auth/password-reset/confirm/route";
import * as reset from "../../app/api/v1/auth/password-reset/route";
import * as register from "../../app/api/v1/auth/register/route";
import * as config from "../../app/api/v1/config/route";
import * as health from "../../app/api/v1/health/route";
import * as removal from "../../app/api/v1/images/remove-background/route";
import { db } from "./db";
import { resetRateLimitsForTests } from "./rateLimit";

const ORIGIN = "http://solva.test";
const PASSWORD = "a-distinct-passphrase";
let directory = "";

function migrate(file: string): void {
  const root = path.resolve(__dirname, "../../prisma/migrations");
  const sqlite = new Database(file);
  for (const name of readdirSync(root).filter((entry) => !entry.endsWith(".toml")).sort()) {
    sqlite.exec(readFileSync(path.join(root, name, "migration.sql"), "utf8"));
  }
  sqlite.close();
}

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), "solva-routes-"));
  const file = path.join(directory, "test.db");
  migrate(file);
  process.env.DATABASE_URL = `file:${file}`;
  process.env.SITE_URL = ORIGIN;
  process.env.REMOVER_URL = "http://remover.test";
});

afterAll(async () => {
  await db().$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.DISABLE_RATE_LIMITS = "true";
  resetRateLimitsForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.BACKGROUND_REMOVAL_RATE;
  delete process.env.MAX_UPLOAD_BYTES;
});

function call(
  method: string,
  url: string,
  options: { json?: unknown; body?: BodyInit; cookie?: string; origin?: string; headers?: Record<string, string> } = {},
): NextRequest {
  const headers: Record<string, string> = { host: "solva.test", ...options.headers };
  if (options.origin !== undefined) headers.origin = options.origin;
  else if (method !== "GET") headers.origin = ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  let body = options.body;
  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  return new NextRequest(`${ORIGIN}${url}`, { method, headers, body });
}

/** The cookie header a browser would send back after this response. */
function sessionCookie(response: Response): string {
  const set = response.headers.getSetCookie().find((value) => value.startsWith("solva_session="));
  if (!set) throw new Error("No session cookie was set.");
  return set.split(";")[0];
}

async function signUp(email: string): Promise<string> {
  const response = await register.POST(
    call("POST", "/api/v1/auth/register", {
      json: { name: "Ada Lovelace", email, password: PASSWORD, confirm_password: PASSWORD },
    }),
  );
  expect(response.status).toBe(201);
  return sessionCookie(response);
}

describe("accounts", () => {
  it("registers, sets an httpOnly session cookie, and reads the profile", async () => {
    const response = await register.POST(
      call("POST", "/api/v1/auth/register", {
        json: { name: " Ada ", email: "ADA@Example.com", password: PASSWORD, confirm_password: PASSWORD },
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ user: { id: expect.any(Number), name: "Ada", email: "ada@example.com", date_joined: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("password");
    const cookies = response.headers.getSetCookie();
    expect(cookies.find((value) => value.startsWith("solva_session="))).toMatch(/HttpOnly/i);
    expect(cookies.find((value) => value.startsWith("solva_signed_in="))).not.toMatch(/HttpOnly/i);

    const profile = await me.GET(call("GET", "/api/v1/auth/me", { cookie: sessionCookie(response) }));
    expect(profile.status).toBe(200);
    expect((await profile.json()).email).toBe("ada@example.com");
  });

  it("refuses a duplicate email and a weak password with field errors", async () => {
    await signUp("dupe@example.com");
    const duplicate = await register.POST(
      call("POST", "/api/v1/auth/register", {
        json: { name: "Again", email: "Dupe@example.com", password: PASSWORD, confirm_password: PASSWORD },
      }),
    );
    expect(duplicate.status).toBe(400);
    expect((await duplicate.json()).error.details.fields.email).toEqual(["An account with this email already exists."]);

    const weak = await register.POST(
      call("POST", "/api/v1/auth/register", {
        json: { name: "Weak", email: "weak@example.com", password: "12345678", confirm_password: "12345678" },
      }),
    );
    expect(weak.status).toBe(400);
    expect((await weak.json()).error.code).toBe("invalid_request");
  });

  it("refuses a cross-site write", async () => {
    const response = await login.POST(
      call("POST", "/api/v1/auth/login", { origin: "https://evil.test", json: { email: "a@b.co", password: "x" } }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("forbidden_origin");
  });

  it("gives the same answer for an unknown email and a wrong password", async () => {
    await signUp("known@example.com");
    for (const email of ["known@example.com", "unknown@example.com"]) {
      const response = await login.POST(call("POST", "/api/v1/auth/login", { json: { email, password: "wrong-password" } }));
      expect(response.status).toBe(401);
      expect((await response.json()).error).toEqual({
        code: "invalid_credentials",
        message: "The email or password is incorrect.",
        details: {},
      });
    }
  });

  it("uses a browser-session cookie when Remember me is off", async () => {
    await signUp("short@example.com");
    const response = await login.POST(
      call("POST", "/api/v1/auth/login", { json: { email: "short@example.com", password: PASSWORD, remember: false } }),
    );
    expect(response.status).toBe(200);
    const set = response.headers.getSetCookie().find((value) => value.startsWith("solva_session="));
    expect(set).not.toMatch(/Max-Age/i);
  });

  it("returns 401 and clears the hint without a session", async () => {
    const response = await me.GET(call("GET", "/api/v1/auth/me"));
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie().some((value) => value.startsWith("solva_signed_in=;"))).toBe(true);
  });

  it("updates the name", async () => {
    const cookie = await signUp("rename@example.com");
    const response = await me.PATCH(call("PATCH", "/api/v1/auth/me", { cookie, json: { name: "Countess" } }));
    expect(response.status).toBe(200);
    expect((await response.json()).name).toBe("Countess");
  });

  it("logs out this browser only", async () => {
    const cookie = await signUp("logout@example.com");
    expect((await logout.POST(call("POST", "/api/v1/auth/logout", { cookie }))).status).toBe(204);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie }))).status).toBe(401);
  });

  it("changes the password, ends other sessions, and keeps this one signed in", async () => {
    const first = await signUp("change@example.com");
    const second = sessionCookie(
      await login.POST(call("POST", "/api/v1/auth/login", { json: { email: "change@example.com", password: PASSWORD } })),
    );
    const wrong = await changePassword.POST(
      call("POST", "/api/v1/auth/change-password", {
        cookie: first,
        json: { current_password: "nope-nope", new_password: "another-passphrase", confirm_password: "another-passphrase" },
      }),
    );
    expect(wrong.status).toBe(400);

    const changed = await changePassword.POST(
      call("POST", "/api/v1/auth/change-password", {
        cookie: first,
        json: { current_password: PASSWORD, new_password: "another-passphrase", confirm_password: "another-passphrase" },
      }),
    );
    expect(changed.status).toBe(200);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie: first }))).status).toBe(401);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie: second }))).status).toBe(401);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie: sessionCookie(changed) }))).status).toBe(200);
  });

  it("resets a password from a one-time link and signs out every browser", async () => {
    const cookie = await signUp("reset@example.com");
    const printed = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const unknown = await reset.POST(call("POST", "/api/v1/auth/password-reset", { json: { email: "nobody@example.com" } }));
    const known = await reset.POST(call("POST", "/api/v1/auth/password-reset", { json: { email: "reset@example.com" } }));
    expect(await unknown.json()).toEqual(await known.json());
    await vi.waitFor(() => expect(printed).toHaveBeenCalled());
    const token = /reset-password\?token=([^\s]+)/.exec(String(printed.mock.calls.at(-1)?.[0]))?.[1];
    expect(token).toBeTruthy();

    const confirm = (password: string) =>
      resetConfirm.POST(
        call("POST", "/api/v1/auth/password-reset/confirm", {
          json: { token: decodeURIComponent(token ?? ""), password, confirm_password: password },
        }),
      );
    expect((await confirm("a-brand-new-passphrase")).status).toBe(200);
    expect((await confirm("a-second-passphrase")).status).toBe(400);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie }))).status).toBe(401);
    const signIn = await login.POST(
      call("POST", "/api/v1/auth/login", { json: { email: "reset@example.com", password: "a-brand-new-passphrase" } }),
    );
    expect(signIn.status).toBe(200);
  });

  it("deletes the account only with the right password", async () => {
    const cookie = await signUp("delete@example.com");
    const wrong = await me.DELETE(call("DELETE", "/api/v1/auth/me", { cookie, json: { password: "wrong-password" } }));
    expect(wrong.status).toBe(400);
    const deleted = await me.DELETE(call("DELETE", "/api/v1/auth/me", { cookie, json: { password: PASSWORD } }));
    expect(deleted.status).toBe(204);
    expect((await me.GET(call("GET", "/api/v1/auth/me", { cookie }))).status).toBe(401);
    expect(await db().user.findUnique({ where: { email: "delete@example.com" } })).toBeNull();
  });
});

function pngBody(): FormData {
  const form = new FormData();
  form.append("image", new File([new Uint8Array([137, 80, 78, 71])], "photo.png", { type: "image/png" }));
  return form;
}

async function multipart(form: FormData): Promise<{ body: ArrayBuffer; type: string }> {
  const encoded = new Response(form);
  return { body: await encoded.arrayBuffer(), type: encoded.headers.get("content-type") ?? "" };
}

async function upload(form = pngBody(), headers: Record<string, string> = {}): Promise<Response> {
  const { body, type } = await multipart(form);
  return removal.POST(call("POST", "/api/v1/images/remove-background", { body, headers: { "content-type": type, ...headers } }));
}

describe("background removal", () => {
  it("forwards the bytes to the remover and returns its PNG", async () => {
    const remover = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("http://remover.test/remove");
      expect(new Uint8Array(init?.body as ArrayBuffer)).toEqual(new Uint8Array([137, 80, 78, 71]));
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png", "x-image-width": "32", "x-image-height": "16" },
      });
    });
    vi.stubGlobal("fetch", remover);
    const response = await upload();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-image-width")).toBe("32");
    expect(response.headers.get("x-image-height")).toBe("16");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("passes the remover's validation error through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { code: "invalid_image", message: "Not an image.", details: {} } }, { status: 400 }),
      ),
    );
    const response = await upload();
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_image");
  });

  it("is a 503, not a fake cutout, when the remover is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const response = await upload();
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("ai_unavailable");
  });

  it("rejects a missing file and an oversized one before calling the remover", async () => {
    const remover = vi.fn();
    vi.stubGlobal("fetch", remover);
    const missing = await upload(new FormData());
    expect(missing.status).toBe(400);
    process.env.MAX_UPLOAD_BYTES = "2";
    const oversized = await upload();
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).error.code).toBe("file_too_large");
    expect(remover).not.toHaveBeenCalled();
  });

  it("rate limits by the address the proxy saw, ignoring a forged one", async () => {
    process.env.DISABLE_RATE_LIMITS = "false";
    process.env.BACKGROUND_REMOVAL_RATE = "1/minute";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } })));
    expect((await upload(pngBody(), { "x-forwarded-for": "1.1.1.1, 203.0.113.5" })).status).toBe(200);
    const blocked = await upload(pngBody(), { "x-forwarded-for": "2.2.2.2, 203.0.113.5" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect((await upload(pngBody(), { "x-forwarded-for": "203.0.113.6" })).status).toBe(200);
  });
});

describe("system", () => {
  it("serves public limits without secrets", async () => {
    process.env.REMOVER_TOKEN = "very-secret";
    const body = await (await config.GET()).json();
    expect(Object.keys(body).sort()).toEqual(
      ["ai_model", "contact_email", "max_dimension_px", "max_upload_bytes", "output_formats", "supported_formats"].sort(),
    );
    expect(JSON.stringify(body)).not.toContain("very-secret");
    delete process.env.REMOVER_TOKEN;
  });

  it("reports degraded health when the remover is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const response = await health.GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.ai.available).toBe(false);
  });
});
