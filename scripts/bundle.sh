#!/bin/bash
set -e

# Build TypeScript
npm run build

# Bundle CLI (ESM)
npx esbuild dist/cli/index.js \
  --bundle \
  --platform=node \
  --target=node24 \
  --format=esm \
  --banner:js='#!/usr/bin/env node' \
  --outfile=bundle/cli/index.js

# Copy templates (Handlebars reads them from fs at runtime)
rm -rf bundle/templates
cp -r src/renderer/templates bundle/templates
