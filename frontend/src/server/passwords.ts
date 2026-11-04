import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt with N=2^15, r=8, p=1 uses about 32 MB and roughly 50–100 ms per hash.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLEL = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Returns `scrypt$N$r$p$salt$hash`, all base64url, so the cost can change later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N: COST, r: BLOCK_SIZE, p: PARALLEL, maxmem: MAX_MEMORY });
  return ["scrypt", COST, BLOCK_SIZE, PARALLEL, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | null = null;

/** Spend the same time on an unknown email as on a wrong password. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "letmein1",
  "welcome1",
  "welcome123",
  "admin123",
  "abc12345",
  "11111111",
  "00000000",
  "sunshine",
  "football",
  "baseball",
  "princess",
  "superman",
  "trustno1",
  "monkey123",
  "dragon123",
  "changeme",
  "solva123",
]);

/** Length, all-digit, common-password, and name/email similarity checks. */
export function passwordProblems(password: string, user: { email?: string; name?: string } = {}): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push("This password is too short. It must contain at least 8 characters.");
  if (password.length > 128) problems.push("Use 128 characters or fewer.");
  if (/^\d+$/.test(password)) problems.push("This password is entirely numeric.");
  const lowered = password.toLowerCase();
  if (COMMON.has(lowered)) problems.push("This password is too common.");
  const local = (user.email ?? "").split("@")[0].toLowerCase();
  const name = (user.name ?? "").trim().toLowerCase();
  const similar = [local, name].some(
    (value) => value.length >= 4 && (lowered.includes(value) || value.includes(lowered)),
  );
  if (similar) problems.push("The password is too similar to your name or email address.");
  return problems;
}
