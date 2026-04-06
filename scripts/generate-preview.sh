#!/usr/bin/env bash
# Generate preview site: theme x lang combinations from example/ data
set -euo pipefail

THEMES="brutalist minimal editorial"
LANGS="en ja"
BASE_URL="${BASE_URL:-https://deariary.github.io/github-weekly-reporter}"
OUT_DIR="${OUT_DIR:-preview-site}"
DATA_DIR="${DATA_DIR:-example}"
DATE="${DATE:-2026-04-06}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

for theme in $THEMES; do
  for lang in $LANGS; do
    dir="$OUT_DIR/$theme/$lang"
    echo "Generating $theme / $lang ..."
    node dist/cli/index.js render \
      --data-dir "$DATA_DIR" \
      --output-dir "$dir" \
      --base-url "$BASE_URL/$theme/$lang" \
      --theme "$theme" \
      --language "$lang" \
      --date "$DATE" \
      --site-title "Preview ($theme / $lang)"
  done
done

# Generate top-level index
node scripts/generate-preview-index.js "$OUT_DIR" "$BASE_URL" "$THEMES" "$LANGS"

echo "Preview site generated at $OUT_DIR/"
