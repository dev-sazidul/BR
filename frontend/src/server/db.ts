import { mkdirSync } from "node:fs";
import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "../generated/prisma/client";

const DEFAULT_URL = "file:./data/solva.db";

function sqliteUrl(): string {
  const url = process.env.DATABASE_URL || DEFAULT_URL;
  const file = url.replace(/^file:/, "");
  if (file !== ":memory:") mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  return url;
}

const globalForPrisma = globalThis as typeof globalThis & { solvaPrisma?: PrismaClient };

/** One client per process. Development reuses it across hot reloads. */
export function db(): PrismaClient {
  if (!globalForPrisma.solvaPrisma) {
    globalForPrisma.solvaPrisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl() }) });
  }
  return globalForPrisma.solvaPrisma;
}
