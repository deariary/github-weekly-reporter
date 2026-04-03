// Load config from .github-weekly-reporter.toml

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "smol-toml";

export type FileConfig = {
  username?: string;
  theme?: string;
  output?: string;
  language?: string;
  timezone?: string;
  llm?: {
    provider?: string;
    model?: string;
  };
};

const CONFIG_FILENAME = ".github-weekly-reporter.toml";

export const loadConfig = async (dir: string = process.cwd()): Promise<FileConfig> => {
  const path = resolve(dir, CONFIG_FILENAME);
  try {
    const content = await readFile(path, "utf-8");
    return parse(content) as FileConfig;
  } catch {
    return {};
  }
};
