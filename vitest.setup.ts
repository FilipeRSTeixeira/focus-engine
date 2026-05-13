// Vitest setup — give each test worker its own throwaway DB so DB-touching
// tests don't trample each other through Prisma's process-wide singleton.
//
// Each Vitest fork has a unique pid; with pool=forks each test file gets its
// own worker process, and so each file gets its own isolated DB.
//
// We deliberately do NOT wipe data here: an external SQLite connection (e.g.
// better-sqlite3) closing right before Prisma opens the file can leave a hot
// rollback journal that Prisma then has to replay, which on some platforms
// surfaces as confusing "record not found" / stale-read errors. Each test
// file's own beforeEach handles wiping via Prisma directly, which is enough
// because pool=forks gives us per-file isolation.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sourceDb = path.resolve(__dirname, "prisma", "dev.db");
const testDb = path.join(os.tmpdir(), `focus-engine-test-${process.pid}.db`);

if (fs.existsSync(sourceDb)) {
  fs.copyFileSync(sourceDb, testDb);
}

process.env.DATABASE_URL = `file:${testDb}`;
