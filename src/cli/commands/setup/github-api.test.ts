import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateToken, ensureRepo, setRepoTopics, addFileToRepo, enablePages, setRepoSecret, sleep, ghGet, ghPost, ghPut } from "./github-api.js";

describe("github-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("ghGet / ghPost / ghPut", () => {
    it("sends GET request with auth headers", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 }),
      );
      await ghGet("token123", "/user");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Authorization: "Bearer token123" }),
        }),
      );
    });

    it("sends POST request with body", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 201 }),
      );
      await ghPost("token", "/repos", { name: "test" });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.github.com/repos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        }),
      );
    });

    it("sends PUT request with body", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 }),
      );
      await ghPut("token", "/path", { data: true });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.github.com/path",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  describe("validateToken", () => {
    it("throws for 401 response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 401 }),
      );
      await expect(validateToken("bad-token")).rejects.toThrow("Invalid or expired token");
    });

    it("throws for non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 500 }),
      );
      await expect(validateToken("token")).rejects.toThrow("GitHub API error: 500");
    });

    it("returns fine-grained when no x-oauth-scopes header", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ login: "testuser" }), {
          status: 200,
          headers: {},
        }),
      );
      const result = await validateToken("token");
      expect(result).toEqual({ login: "testuser", tokenType: "fine-grained" });
    });

    it("returns classic when scopes are sufficient", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ login: "testuser" }), {
          status: 200,
          headers: { "x-oauth-scopes": "repo, workflow" },
        }),
      );
      const result = await validateToken("token");
      expect(result).toEqual({ login: "testuser", tokenType: "classic" });
    });

    it("throws when classic PAT is missing required scopes", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ login: "testuser" }), {
          status: 200,
          headers: { "x-oauth-scopes": "repo" },
        }),
      );
      await expect(validateToken("token")).rejects.toThrow("missing required scopes: workflow");
    });
  });

  describe("ensureRepo", () => {
    it("returns false if repo already exists", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 }),
      );
      const result = await ensureRepo("token", "user/repo");
      expect(result).toBe(false);
    });

    it("creates user repo when owner matches login", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 })) // repo doesn't exist
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: "user" }), { status: 200 })) // /user
        .mockResolvedValueOnce(new Response("", { status: 201 })); // create repo

      const result = await ensureRepo("token", "user/repo");
      expect(result).toBe(true);

      // Verify homepage is set in the create request
      const createCall = fetchSpy.mock.calls[2];
      const body = JSON.parse(createCall[1]!.body as string);
      expect(body.homepage).toBe("https://user.github.io/repo");
    });

    it("creates org repo when owner differs from login", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 })) // repo doesn't exist
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: "me" }), { status: 200 })) // /user
        .mockResolvedValueOnce(new Response("", { status: 201 })); // create repo

      await ensureRepo("token", "org/repo");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.github.com/orgs/org/repos",
        expect.any(Object),
      );
    });

    it("throws when repo creation fails", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ login: "user" }), { status: 200 }))
        .mockResolvedValueOnce(new Response("error details", { status: 422 }));

      await expect(ensureRepo("token", "user/repo")).rejects.toThrow("Failed to create user/repo");
    });
  });

  describe("setRepoTopics", () => {
    it("sends PUT request with topic names", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 200 }),
      );
      await setRepoTopics("token", "user/repo");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.github.com/repos/user/repo/topics",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("github-weekly-reporter"),
        }),
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.names).toEqual(expect.arrayContaining([
        "github-weekly-reporter",
        "weekly-report",
        "github-activity",
        "github-pages",
      ]));
    });
  });

  describe("addFileToRepo", () => {
    it("adds a new file when it does not exist", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 })) // file doesn't exist
        .mockResolvedValueOnce(new Response("", { status: 201 })); // create file

      await expect(addFileToRepo("token", "user/repo", "README.md", "# Hello", "init")).resolves.toBeUndefined();
    });

    it("updates an existing file with sha", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "abc123" }), { status: 200 })) // file exists
        .mockResolvedValueOnce(new Response("", { status: 200 })); // update file

      await addFileToRepo("token", "user/repo", "README.md", "# Updated", "update");
      const putCall = fetchSpy.mock.calls[1];
      expect(JSON.parse(putCall[1]!.body as string)).toHaveProperty("sha", "abc123");
    });

    it("throws when file creation fails", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("", { status: 404 }))
        .mockResolvedValueOnce(new Response("", { status: 422 }));

      await expect(addFileToRepo("token", "user/repo", "file.txt", "content", "msg"))
        .rejects.toThrow("Failed to add file.txt");
    });
  });

  describe("enablePages", () => {
    it("returns the Pages URL", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 201 }),
      );
      const url = await enablePages("token", "user/repo");
      expect(url).toBe("https://user.github.io/repo");
    });
  });

  describe("setRepoSecret", () => {
    // Generate a valid 32-byte public key for libsodium sealed box
    const makeValidKeyResponse = async () => {
      const { default: _sodium } = await import("libsodium-wrappers");
      await _sodium.ready;
      const keyPair = _sodium.crypto_box_keypair();
      const publicKeyB64 = _sodium.to_base64(keyPair.publicKey, _sodium.base64_variants.ORIGINAL);
      return { key: publicKeyB64, key_id: "kid123" };
    };

    it("returns true on successful secret creation (no retry needed)", async () => {
      const keyData = await makeValidKeyResponse();
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(keyData), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response("", { status: 200 }));

      // No sleep is called when first attempt succeeds
      const result = await setRepoSecret("token", "user/repo", "SECRET", "value");
      expect(result).toBe(true);
    });
  });

  describe("sleep", () => {
    it("resolves after delay", async () => {
      vi.useFakeTimers();
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await promise;
      vi.useRealTimers();
    });
  });
});
