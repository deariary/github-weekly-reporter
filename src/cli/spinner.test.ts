import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withSpinner } from "./spinner.js";

const captureWrites = () => {
  const writes: string[] = [];
  const spy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    });
  return { writes, spy };
};

const setTTY = (value: boolean) => {
  const original = process.stderr.isTTY;
  Object.defineProperty(process.stderr, "isTTY", { value, configurable: true });
  return () => {
    Object.defineProperty(process.stderr, "isTTY", { value: original, configurable: true });
  };
};

describe("withSpinner", () => {
  describe("non-TTY environment", () => {
    let restoreTTY: () => void;

    beforeEach(() => {
      restoreTTY = setTTY(false);
    });

    afterEach(() => {
      restoreTTY();
      vi.restoreAllMocks();
    });

    it("writes the message once and returns the task result", async () => {
      const { writes } = captureWrites();
      const result = await withSpinner("loading", async () => 42);

      expect(result).toBe(42);
      expect(writes).toEqual(["  loading\n"]);
    });

    it("propagates errors thrown by the task without animation", async () => {
      const { writes } = captureWrites();
      const error = new Error("boom");

      await expect(
        withSpinner("loading", async () => {
          throw error;
        }),
      ).rejects.toBe(error);

      expect(writes).toEqual(["  loading\n"]);
    });
  });

  describe("TTY environment", () => {
    let restoreTTY: () => void;

    beforeEach(() => {
      restoreTTY = setTTY(true);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      restoreTTY();
      vi.restoreAllMocks();
    });

    it("renders animated frames and a success marker", async () => {
      const { writes } = captureWrites();

      const promise = withSpinner("working", async () => {
        await vi.advanceTimersByTimeAsync(200);
        return "done";
      });

      const result = await promise;

      expect(result).toBe("done");
      expect(writes.some((w) => w.includes("working"))).toBe(true);
      expect(writes.some((w) => w.includes("✔ working"))).toBe(true);
      expect(writes.at(-1)).toBe("\r  ✔ working\n");
    });

    it("renders an error marker and rethrows", async () => {
      const { writes } = captureWrites();
      const error = new Error("nope");

      await expect(
        withSpinner("working", async () => {
          await vi.advanceTimersByTimeAsync(80);
          throw error;
        }),
      ).rejects.toBe(error);

      expect(writes.some((w) => w.includes("✖ working"))).toBe(true);
      expect(writes.at(-1)).toBe("\r  ✖ working\n");
    });

    it("clears the interval after completion", async () => {
      const clearSpy = vi.spyOn(global, "clearInterval");
      captureWrites();

      await withSpinner("ok", async () => "value");

      expect(clearSpy).toHaveBeenCalledTimes(1);
    });
  });
});
