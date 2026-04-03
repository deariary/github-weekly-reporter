import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("loads config from .github-weekly-reporter.toml", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gwr-config-"));
    try {
      await writeFile(
        join(dir, ".github-weekly-reporter.toml"),
        `username = "testuser"\ntheme = "dark"\n\n[llm]\nprovider = "openai"\nmodel = "gpt-4o-mini"\n`,
        "utf-8",
      );

      const config = await loadConfig(dir);
      expect(config.username).toBe("testuser");
      expect(config.theme).toBe("dark");
      expect(config.llm?.provider).toBe("openai");
      expect(config.llm?.model).toBe("gpt-4o-mini");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns empty object when file does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gwr-config-"));
    try {
      const config = await loadConfig(dir);
      expect(config).toEqual({});
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
