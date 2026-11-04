// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import { validateRegistration } from "./accounts";
import { ApiError } from "./errors";
import { assertSameOrigin, clientIp, readBodyLimited } from "./http";
import { hashPassword, passwordProblems, verifyPassword } from "./passwords";
import { consume, parseRate, resetRateLimitsForTests } from "./rateLimit";

function request(headers: Record<string, string>, body?: BodyInit): Request {
  return new Request("http://solva.test/api", { method: "POST", headers, body });
}

describe("clientIp", () => {
  it("takes the entry the trusted proxy appended, not the one the client sent", () => {
    const forged = request({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    expect(clientIp(forged, 1)).toBe("203.0.113.9");
    expect(clientIp(request({ "x-forwarded-for": "1.1.1.1, 10.0.0.2, 10.0.0.1" }), 2)).toBe("10.0.0.2");
  });

  it("never reads past the left edge", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.9" }), 3)).toBe("203.0.113.9");
    expect(clientIp(request({}), 1)).toBe("unknown");
  });
});

describe("rate limits", () => {
  afterEach(() => resetRateLimitsForTests());

  it("parses rates", () => {
    expect(parseRate("10/minute")).toEqual({ limit: 10, windowMs: 60_000 });
    expect(parseRate("3/h")).toEqual({ limit: 3, windowMs: 3_600_000 });
    expect(() => parseRate("lots")).toThrow();
  });

  it("refuses the request after the limit, then resets with the window", () => {
    expect(consume("k", "2/minute", 0).ok).toBe(true);
    expect(consume("k", "2/minute", 1).ok).toBe(true);
    const blocked = consume("k", "2/minute", 2);
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 60 });
    expect(consume("other", "2/minute", 2).ok).toBe(true);
    expect(consume("k", "2/minute", 60_001).ok).toBe(true);
  });
});

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const first = await hashPassword("a-distinct-passphrase");
    const second = await hashPassword("a-distinct-passphrase");
    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("a-distinct-passphrase", first)).toBe(true);
    expect(await verifyPassword("a-distinct-passphrasE", first)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("rejects short, numeric, common, and personal passwords", () => {
    expect(passwordProblems("short")).toHaveLength(1);
    expect(passwordProblems("1234567890")).toContain("This password is entirely numeric.");
    expect(passwordProblems("Password123")).toContain("This password is too common.");
    expect(passwordProblems("adalovelace-1815", { email: "adalovelace@example.com" })).toContain(
      "The password is too similar to your name or email address.",
    );
    expect(passwordProblems("a-distinct-passphrase", { email: "ada@example.com", name: "Ada" })).toEqual([]);
  });

  it("returns field errors with the first message as the summary", () => {
    try {
      validateRegistration({ name: " ", email: "nope", password: "x", confirmPassword: "y" });
      throw new Error("expected a validation error");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.message).toBe("Enter your name.");
      expect(apiError.details.fields).toEqual({
        name: ["Enter your name."],
        email: ["Enter a valid email address."],
        confirm_password: ["Passwords do not match."],
      });
    }
  });
});

describe("request guards", () => {
  it("stops reading a body once it passes the limit, even without Content-Length", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(600));
        controller.enqueue(new Uint8Array(600));
        controller.close();
      },
    });
    const streamed = new Request("http://solva.test/api", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readBodyLimited(streamed, 1000)).rejects.toMatchObject({ status: 413 });
    expect((await readBodyLimited(request({}, "hello"), 1000)).byteLength).toBe(5);
  });

  it("refuses a cross-site Origin and allows the same host", () => {
    expect(() => assertSameOrigin(request({ host: "solva.test", origin: "https://evil.test" }))).toThrow(ApiError);
    expect(() => assertSameOrigin(request({ host: "solva.test", origin: "http://solva.test" }))).not.toThrow();
    expect(() => assertSameOrigin(request({ host: "solva.test" }))).not.toThrow();
  });
});
