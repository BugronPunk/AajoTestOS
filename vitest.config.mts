import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The store serialises writes through one process wide queue, so test files
    // share a single fork to keep those queue semantics honest. Each file still
    // gets its own DATA_DIR.
    pool: "forks",
    fileParallelism: false,
  },
});
