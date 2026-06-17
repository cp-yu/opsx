#!/usr/bin/env bash
set -euo pipefail

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME="fission-ai-openspec-${VERSION}.tgz"

echo "🔨 Building OpenSpec v${VERSION}..."
echo

# Build the project
pnpm run build

echo
echo "📦 Creating package tarball..."
pnpm pack

echo
echo "🌍 Installing globally..."
npm install -g "${PACKAGE_NAME}"

echo
echo "✅ Build and install completed!"
echo "   Version: ${VERSION}"
echo "   Package: ${PACKAGE_NAME}"
echo
echo "Run 'openspec --version' to verify installation."
