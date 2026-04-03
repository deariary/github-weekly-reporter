#!/usr/bin/env node

// CLI entrypoint

import { Command } from "commander";
import { registerGenerate } from "./commands/generate.js";
import { registerDeploy } from "./commands/deploy.js";

const program = new Command()
  .name("github-weekly-reporter")
  .description("Generate beautiful weekly GitHub activity reports")
  .version("0.1.0");

registerGenerate(program);
registerDeploy(program);

program.parse();
