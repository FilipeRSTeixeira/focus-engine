import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Each test file gets its own Node process (and therefore its own DB
    // file, via vitest.setup.ts), so DB-touching tests don't contaminate
    // each other through Prisma's shared singleton.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: false },
    },
  },
});
