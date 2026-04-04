import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFile = vi.fn();
const mockMkdtemp = vi.fn();
const mockRm = vi.fn();
const mockReaddir = vi.fn();
const mockCp = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

vi.mock("node:util", () => ({
  promisify: () => mockExecFile,
}));

vi.mock("node:fs/promises", () => ({
  mkdtemp: mockMkdtemp,
  rm: mockRm,
  readdir: mockReaddir,
  cp: mockCp,
}));

describe("deploy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdtemp.mockResolvedValue("/tmp/gwr-deploy-abc");
    mockRm.mockResolvedValue(undefined);
    mockCp.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(["index.html", "2026"]);
  });

  it("clones gh-pages branch and copies files", async () => {
    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // clone
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "M index.html\n", stderr: "" }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // commit
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // push

    const { deploy } = await import("./index.js");
    await deploy({ repoUrl: "https://github.com/user/repo.git", directory: "/output" });

    expect(mockReaddir).toHaveBeenCalledWith("/output");
    expect(mockCp).toHaveBeenCalledTimes(2);
    expect(mockRm).toHaveBeenCalledWith("/tmp/gwr-deploy-abc", { recursive: true, force: true });
  });

  it("skips commit when no changes detected", async () => {
    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // clone
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // status (empty)

    const { deploy } = await import("./index.js");
    await deploy({ repoUrl: "https://github.com/user/repo.git", directory: "/output" });

    // Should not have called commit or push (only 5 calls, not 7)
    expect(mockExecFile).toHaveBeenCalledTimes(5);
  });

  it("initializes fresh repo when clone fails", async () => {
    mockExecFile
      .mockRejectedValueOnce(new Error("not found")) // clone fails
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // init
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // checkout orphan
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "A index.html\n", stderr: "" }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // commit
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // push

    const { deploy } = await import("./index.js");
    await deploy({ repoUrl: "https://github.com/user/repo.git", directory: "/output" });

    // init and checkout --orphan should have been called
    expect(mockExecFile).toHaveBeenCalledWith("git", ["init"], expect.any(Object));
    expect(mockExecFile).toHaveBeenCalledWith("git", ["checkout", "--orphan", "gh-pages"], expect.any(Object));
  });

  it("uses custom commit message", async () => {
    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // clone
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.name
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // config user.email
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // add .
      .mockResolvedValueOnce({ stdout: "M file\n", stderr: "" }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // commit
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // push

    const { deploy } = await import("./index.js");
    await deploy({
      repoUrl: "https://github.com/user/repo.git",
      directory: "/output",
      message: "deploy: W14",
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", "deploy: W14"],
      expect.any(Object),
    );
  });

  it("cleans up temp directory even on error", async () => {
    mockExecFile
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // clone
      .mockRejectedValueOnce(new Error("config failed")); // config fails

    const { deploy } = await import("./index.js");
    await expect(deploy({ repoUrl: "url", directory: "/out" })).rejects.toThrow();
    expect(mockRm).toHaveBeenCalledWith("/tmp/gwr-deploy-abc", { recursive: true, force: true });
  });
});
