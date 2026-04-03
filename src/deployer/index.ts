// Deploy report to gh-pages branch

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readdir, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { getWeekId, type WeekId } from "./week.js";
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

export type DeployResult = {
  weekId: WeekId;
  reportPath: string;
};

const listReportDirs = async (dir: string): Promise<string[]> => {
  const paths: string[] = [];

  let years: string[] = [];
  try {
    years = await readdir(dir);
  } catch {
    return paths;
  }

  for (const year of years.filter((name) => /^\d{4}$/.test(name))) {
    const weeks = await readdir(join(dir, year));
    weeks
      .filter((name) => /^W\d{2}$/.test(name))
      .forEach((w) => paths.push(`${year}/${w}`));
  }

  return paths;
};

const cloneGhPages = async (repoUrl: string, workDir: string): Promise<void> => {
  try {
    await exec("git", ["clone", "--branch", "gh-pages", "--single-branch", "--depth", "1", repoUrl, workDir]);
  } catch {
    await git(["init"], workDir);
    await git(["checkout", "--orphan", "gh-pages"], workDir);
  }
};

const commitAndPush = async (workDir: string, weekPath: string): Promise<void> => {
  await git(["add", "."], workDir);

  try {
    await git(["diff", "--cached", "--quiet"], workDir);
    return; // no changes
  } catch {
    // has changes
  }

  await git(["config", "user.name", "github-weekly-reporter"], workDir);
  await git(["config", "user.email", "github-weekly-reporter@users.noreply.github.com"], workDir);
  await git(["commit", "-m", `report: ${weekPath}`], workDir);
  await git(["push", "origin", "gh-pages"], workDir);
};

export const deploy = async (options: DeployOptions): Promise<DeployResult> => {
  const { repoUrl, reportHtml, theme = "default" } = options;
  const weekId = getWeekId();
  const workDir = await mkdtemp(join(tmpdir(), "gwr-deploy-"));

  try {
    await cloneGhPages(repoUrl, workDir);

    // Write report
    const reportDir = join(workDir, weekId.path);
    await mkdir(reportDir, { recursive: true });
    await writeFile(join(reportDir, "index.html"), reportHtml, "utf-8");

    // Write index page
    const allReports = await listReportDirs(workDir);
    if (!allReports.includes(weekId.path)) allReports.push(weekId.path);
    const indexHtml = renderIndexPage(allReports, theme);
    await writeFile(join(workDir, "index.html"), indexHtml, "utf-8");

    await commitAndPush(workDir, weekId.path);

    return { weekId, reportPath: `${weekId.path}/index.html` };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};
