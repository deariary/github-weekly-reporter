#!/bin/bash
set -e

# Build TypeScript
npm run build

# Bundle action (CJS for GitHub Actions runner)
npx esbuild dist/action/index.js \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=bundle/action/index.js

# Bundle CLI (ESM)
npx esbuild dist/cli/index.js \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --banner:js='#!/usr/bin/env node' \
  --outfile=bundle/cli/index.js

# Copy templates (Handlebars reads them from fs at runtime)
cp -r src/renderer/templates bundle/templates
