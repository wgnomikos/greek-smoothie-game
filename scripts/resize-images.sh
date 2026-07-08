#!/usr/bin/env bash
# Resize all jpgs in public/images/ to 800x800 (square crop, no upscale).
# Requires: brew install imagemagick
# Run after dropping new photos in public/images/<category>/.
set -euo pipefail

cd "$(dirname "$0")/.."

find public/images -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) | while read -r f; do
  echo "Resizing $f"
  magick "$f" -resize 800x800^ -gravity center -extent 800x800 -quality 85 "$f"
done

echo "Done. File sizes:"
find public/images -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -exec ls -lah {} \;
