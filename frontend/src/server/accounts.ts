import { invalidRequest } from "./errors";
import { passwordProblems } from "./passwords";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

type Fields = Record<string, string[]>;

function add(fields: Fields, name: string, message: string): void {
  (fields[name] ??= []).push(message);
}

function throwIfAny(fields: Fields): void {
  if (Object.keys(fields).length > 0) throw invalidRequest(fields);
}

export function cleanName(value: string, fields: Fields): string {
  const name = value.trim();
  if (!name) add(fields, "name", "Enter your name.");
  else if (name.length > 150) add(fields, "name", "Use 150 characters or fewer.");
  return name;
}

export function cleanEmail(value: string, fields: Fields): string {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !EMAIL.test(email)) add(fields, "email", "Enter a valid email address.");
  return email;
}

export function validateRegistration(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): { name: string; email: string } {
  const fields: Fields = {};
  const name = cleanName(input.name, fields);
  const email = cleanEmail(input.email, fields);
  if (!input.password) add(fields, "password", "Enter a password.");
  else if (input.password !== input.confirmPassword) add(fields, "confirm_password", "Passwords do not match.");
  else for (const problem of passwordProblems(input.password, { email, name })) add(fields, "password", problem);
  throwIfAny(fields);
  return { name, email };
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
  user: { email: string; name: string },
  field = "password",
): void {
  const fields: Fields = {};
  if (!password) add(fields, field, "Enter a password.");
  else if (password !== confirmPassword) add(fields, "confirm_password", "Passwords do not match.");
  else for (const problem of passwordProblems(password, user)) add(fields, field, problem);
  throwIfAny(fields);
}

/** Prisma's unique-constraint error, e.g. two sign-ups racing for one email. */
export function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "P2002");
}

export const EMAIL_TAKEN = "An account with this email already exists.";

export function requireFields(values: Record<string, string>): void {
  const fields: Fields = {};
  for (const [name, value] of Object.entries(values)) {
    if (!value) add(fields, name, "This field is required.");
  }
  throwIfAny(fields);
}
