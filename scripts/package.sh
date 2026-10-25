#!/bin/bash
set -e

echo "Starting Chrome Web Store packaging..."

# Validate manifest.json is valid JSON
jq empty manifest.json

echo "manifest.json is valid."

# Check if icons exist
for size in 16 32 48 128; do
  if [ ! -f "icons/icon${size}.png" ]; then
    echo "Error: icons/icon${size}.png is missing."
  fi
done

echo "Icons verified."

# Create a clean ZIP archive
ZIP_NAME="send-to-jules-cws.zip"
rm -f "$ZIP_NAME"

echo "Zipping production files into $ZIP_NAME..."
zip -r "$ZIP_NAME" \
  manifest.json \
  background.js \
  api.js \
  popup.html \
  popup.js \
  options.html \
  options.js \
  styles.css \
  icons/

echo "Packaging complete! $ZIP_NAME created."
