// Deploy output directory to gh-pages branch, preserving existing files

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const exec = promisify(execFile);

const git = (args: string[], cwd: string) =>
  exec("git", args, { cwd });

export type DeployOptions = {
  repoUrl: string;
  directory: string;
  message?: string;
};

export const deploy = async (options: DeployOptions): Promise<void> => {
  const { repoUrl, directory, message = "deploy" } = options;
  const tmp = await mkdtemp(join(tmpdir(), "gwr-deploy-"));

  try {
    // Try to clone existing gh-pages branch
    try {
      await exec("git", ["clone", "--branch", "gh-pages", "--single-branch", "--depth", "1", repoUrl, tmp]);
    } catch {
      // gh-pages doesn't exist yet, init a fresh repo
      await git(["init"], tmp);
      await git(["checkout", "--orphan", "gh-pages"], tmp);
    }

    await git(["config", "user.name", "github-weekly-reporter[bot]"], tmp);
    await git(["config", "user.email", "github-weekly-reporter[bot]@users.noreply.github.com"], tmp);

    // Copy output files into the cloned gh-pages directory
    const entries = await readdir(directory);
    await Promise.all(
      entries.map((entry) =>
        cp(join(directory, entry), join(tmp, entry), { recursive: true, force: true }),
      ),
    );

    // Stage all changes
    await git(["add", "."], tmp);

    const { stdout } = await git(["status", "--porcelain"], tmp);
    if (!stdout.trim()) return;

    await git(["commit", "-m", message], tmp);
    await git(["push", repoUrl, "gh-pages", "--force"], tmp);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
};
