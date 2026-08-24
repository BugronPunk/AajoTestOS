import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Points the store at a throwaway directory before any module that reads
 * DATA_DIR is imported. Callers must invoke this at the very top of a test file,
 * ahead of the dynamic imports of the modules under test.
 */
export function createTemporaryStore(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "aajostest_"));
  process.env.DATA_DIR = dir;
  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
