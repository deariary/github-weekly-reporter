import { describe, it, expect, vi, afterEach } from "vitest";

// The CLI entrypoint reads package.json and calls program.parse() at import
// time. We stub argv so commander treats this as a "no subcommand" invocation
// (which prints help and returns without invoking any handler), ensuring the
// import is side-effect safe under test.

describe("cli/index entrypoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("registers the program version from package.json without throwing", async () => {
    // Capture argv: only the node + program name, no subcommand. Commander
    // calls process.exit(1) for missing-command help; we stub exit so the
    // import resolves cleanly and exercises the registerXxx wiring.
    const originalArgv = process.argv;
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(((_chunk: string | Uint8Array) => true) as typeof process.stdout.write);
    const errSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(((_chunk: string | Uint8Array) => true) as typeof process.stderr.write);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((_code?: number) => undefined as never) as typeof process.exit);

    try {
      process.argv = ["node", "github-weekly-reporter"];
      await expect(import("./index.js")).resolves.toBeDefined();
      // Commander exits with 1 when no subcommand is supplied (after printing help).
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      process.argv = originalArgv;
      writeSpy.mockRestore();
      errSpy.mockRestore();
      logSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});
