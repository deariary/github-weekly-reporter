#!/usr/bin/env node

// CLI entrypoint

import { Command } from "commander";
import { registerFetch } from "./commands/fetch.js";
import { registerGenerate } from "./commands/generate.js";
import { registerRender } from "./commands/render.js";
import { registerDeploy } from "./commands/deploy.js";

const program = new Command()
  .name("github-weekly-reporter")
  .description("Generate beautiful weekly GitHub activity reports")
  .version("0.1.0");

registerFetch(program);
registerGenerate(program);
registerRender(program);
registerDeploy(program);

program.parse();
