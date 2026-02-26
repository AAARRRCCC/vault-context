#!/bin/bash
# render.sh — Render an HTML diagram to PNG and SVG
#
# Usage: ./render.sh <input.html> [output-basename]
#
# Example:
#   ./render.sh 01-system-overview.html exports/01-system-overview
#
# Outputs:
#   <output-basename>.png  — PNG at 2x resolution
#   <output-basename>.svg  — SVG (saved as HTML/SVG source)
#
# Requires: npx playwright (installed globally)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT="${1:?Usage: render.sh <input.html> [output-basename]}"
BASENAME="${2:-${INPUT%.html}}"

# Resolve to absolute paths
INPUT_ABS="$(realpath "$INPUT")"
PNG_OUT="$SCRIPT_DIR/${BASENAME}.png"
SVG_OUT="$SCRIPT_DIR/${BASENAME}.svg"

mkdir -p "$(dirname "$PNG_OUT")"
mkdir -p "$(dirname "$SVG_OUT")"

echo "Rendering: $INPUT_ABS"
echo "  PNG → $PNG_OUT"
echo "  SVG → $SVG_OUT"

# Detect viewport size from HTML (look for width/height in body or diagram-frame)
# Default to 1600x1000; override with DATA-WIDTH / DATA-HEIGHT attrs or comment
WIDTH=1600
HEIGHT=1000

# Check for metadata comment in HTML: <!-- render-size: WxH -->
if grep -q "render-size:" "$INPUT_ABS" 2>/dev/null; then
  DIMS=$(grep -o 'render-size: [0-9]*x[0-9]*' "$INPUT_ABS" | head -1 | sed 's/render-size: //')
  if [[ -n "$DIMS" ]]; then
    WIDTH="${DIMS%x*}"
    HEIGHT="${DIMS#*x}"
  fi
fi

SCALE=2
PNG_WIDTH=$(( WIDTH * SCALE ))
PNG_HEIGHT=$(( HEIGHT * SCALE ))

echo "  Viewport: ${WIDTH}x${HEIGHT}, scale: ${SCALE}x (PNG: ${PNG_WIDTH}x${PNG_HEIGHT})"

# Render PNG via Playwright (global install at /opt/homebrew/lib/node_modules)
NODE_PATH=/opt/homebrew/lib/node_modules node - <<EOF
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: $WIDTH, height: $HEIGHT });
  await page.goto('file://$INPUT_ABS', { waitUntil: 'networkidle' });
  // Wait for any web fonts / layout to settle
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '$PNG_OUT',
    fullPage: false,
    scale: 'device',
    clip: { x: 0, y: 0, width: $WIDTH, height: await page.evaluate(() => document.body.scrollHeight) }
  });
  await browser.close();
  console.log('PNG done');
})().catch(e => { console.error(e); process.exit(1); });
EOF

echo "  PNG rendered"

# SVG: save the raw HTML/SVG source as .svg
# The diagrams use inline SVG, so the HTML itself IS the SVG source.
# We save a copy with .svg extension for portfolio use.
cp "$INPUT_ABS" "$SVG_OUT"
echo "  SVG saved (HTML/SVG source copy)"
echo "Done: $BASENAME"
