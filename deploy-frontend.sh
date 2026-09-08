#!/bin/bash
# Rebuilds the frontend and deploys it to Netlify via direct zip upload.
# Uses Python's zipfile (not PowerShell Compress-Archive or .NET ZipFile,
# both of which write backslash path separators on Windows — Netlify then
# can't find files under "assets/" since they got stored as literal
# backslash-named entries instead of a real subfolder).
set -e

NETLIFY_SITE_ID="eec5be31-ec0e-4652-8b68-f488e3d39088"
NETLIFY_TOKEN="${NETLIFY_AUTH_TOKEN:?Set NETLIFY_AUTH_TOKEN first}"

cd "$(dirname "$0")/frontend"
npm run build

ZIP_PATH="../staffgo-deploy.zip"
rm -f "$ZIP_PATH"
python -c "
import zipfile, os
src = 'dist'
with zipfile.ZipFile('$ZIP_PATH', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, src).replace(os.sep, '/')
            zf.write(full, rel)
"

DEPLOY_ID=$(curl -s -X POST "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/zip" \
  --data-binary @"$ZIP_PATH" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Deploy ID: $DEPLOY_ID"
while true; do
  STATE=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID" | grep -o '"state":"[^"]*"' | head -1)
  echo "$STATE"
  if echo "$STATE" | grep -qE "ready|error"; then break; fi
  sleep 3
done

rm -f "$ZIP_PATH"
echo "Done: https://staffgo-app.netlify.app"
