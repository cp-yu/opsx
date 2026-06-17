#!/usr/bin/env bash
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 1.4.2-cpyu.1"
  exit 1
fi

NEW_VERSION="$1"

# Extract current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo "Updating version: $CURRENT_VERSION → $NEW_VERSION"
echo

# Update package.json
echo "✓ Updating package.json"
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update README.md
echo "✓ Updating README.md"
sed -i "s|v$CURRENT_VERSION/fission-ai-openspec-$CURRENT_VERSION|v$NEW_VERSION/fission-ai-openspec-$NEW_VERSION|g" README.md
sed -i "s|occurrences of \`$CURRENT_VERSION\`|occurrences of \`$NEW_VERSION\`|g" README.md

# Update docs/installation.md
echo "✓ Updating docs/installation.md"
sed -i "s|v$CURRENT_VERSION/fission-ai-openspec-$CURRENT_VERSION|v$NEW_VERSION/fission-ai-openspec-$NEW_VERSION|g" docs/installation.md
sed -i "s|Replace \`$CURRENT_VERSION\`|Replace \`$NEW_VERSION\`|g" docs/installation.md

# Update verification-assessment.json if it exists
if [ -f "verification-assessment.json" ]; then
  echo "✓ Updating verification-assessment.json"
  sed -i "s|generatedBy: $CURRENT_VERSION|generatedBy: $NEW_VERSION|g" verification-assessment.json
fi

echo
echo "✅ Version updated successfully!"
echo "Changed files:"
git diff --name-only 2>/dev/null || echo "  (not a git repository or no changes detected)"
