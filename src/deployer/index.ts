// Deploy report to gh-pages branch via git commands

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readdir, mkdir, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getWeekId } from "./week.js";
import { renderIndexPage } from "./index-page.js";
import type { Theme } from "../types.js";

const exec = promisify(execFile);

const git = (args: string[], cwd: string) =>
  exec("git", args, { cwd });

export type DeployOptions = {
  repoUrl: string;
  reportHtml: string;
  theme?: Theme;
};

const listDirectories = async (dir: string): Promise<string[]> => {
  const years = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];

  for (const year of years.filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))) {
    const weeks = await readdir(join(dir, year.name), { withFileTypes: true });
    weeks
      .filter((d) => d.isDirectory() && /^W\d{2}$/.test(d.name))
      .forEach((w) => paths.push(`${year.name}/${w.name}`));
  }

  return paths;
};

export const deploy = async (options: DeployOptions): Promise<string> => {
  const { repoUrl, reportHtml, theme = "default" } = options;
  const weekId = getWeekId();
  const workDir = await mkdtemp(join(tmpdir(), "gwr-deploy-"));

  try {
    // Clone gh-pages branch (or create empty)
    try {
      await git(["clone", "--branch", "gh-pages", "--single-branch", "--depth", "1", repoUrl, workDir], workDir);
    } catch {
      await git(["init", workDir], workDir);
      await git(["checkout", "--orphan", "gh-pages"], workDir);
    }

    // Write report to weekly directory
    const reportDir = join(workDir, weekId.path);
    await mkdir(reportDir, { recursive: true });
    await writeFile(join(reportDir, "index.html"), reportHtml, "utf-8");

    // Build index page from all existing report directories
    const allReports = await listDirectories(workDir);
    if (!allReports.includes(weekId.path)) allReports.push(weekId.path);
    const indexHtml = renderIndexPage(allReports, theme);
    await writeFile(join(workDir, "index.html"), indexHtml, "utf-8");

    // Commit and push
    await git(["add", "."], workDir);

    try {
      await git(["diff", "--cached", "--quiet"], workDir);
      // No changes to commit
      return weekId.path;
    } catch {
      // There are changes (diff --cached returns non-zero)
    }

    await git(["config", "user.name", "github-weekly-reporter"], workDir);
    await git(["config", "user.email", "github-weekly-reporter@users.noreply.github.com"], workDir);
    await git(["commit", "-m", `report: ${weekId.path}`], workDir);
    await git(["push", "origin", "gh-pages"], workDir);

    return weekId.path;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};
