#!/bin/bash
set -e

# Build standalone binaries for qamax-auth CLI
# Requires: npm install -g pkg

VERSION=$(node -p "require('./package.json').version")
NAME="qamax-auth"
DIST_DIR="dist"

echo "Building $NAME v$VERSION..."

# Clean
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build binaries using pkg
echo "Creating standalone binaries..."
npx pkg . \
  --targets node18-macos-x64,node18-macos-arm64,node18-linux-x64,node18-win-x64 \
  --output "$DIST_DIR/$NAME" \
  --compress GZip

# Create tarballs for each platform
echo "Creating tarballs..."

# macOS x64
mkdir -p "$DIST_DIR/qamax-auth-darwin-x64"
mv "$DIST_DIR/$NAME-macos-x64" "$DIST_DIR/qamax-auth-darwin-x64/qamax-auth"
chmod +x "$DIST_DIR/qamax-auth-darwin-x64/qamax-auth"
tar -czf "$DIST_DIR/qamax-auth-v$VERSION-darwin-x64.tar.gz" -C "$DIST_DIR" "qamax-auth-darwin-x64"

# macOS arm64
mkdir -p "$DIST_DIR/qamax-auth-darwin-arm64"
mv "$DIST_DIR/$NAME-macos-arm64" "$DIST_DIR/qamax-auth-darwin-arm64/qamax-auth"
chmod +x "$DIST_DIR/qamax-auth-darwin-arm64/qamax-auth"
tar -czf "$DIST_DIR/qamax-auth-v$VERSION-darwin-arm64.tar.gz" -C "$DIST_DIR" "qamax-auth-darwin-arm64"

# Linux x64
mkdir -p "$DIST_DIR/qamax-auth-linux-x64"
mv "$DIST_DIR/$NAME-linux-x64" "$DIST_DIR/qamax-auth-linux-x64/qamax-auth"
chmod +x "$DIST_DIR/qamax-auth-linux-x64/qamax-auth"
tar -czf "$DIST_DIR/qamax-auth-v$VERSION-linux-x64.tar.gz" -C "$DIST_DIR" "qamax-auth-linux-x64"

# Windows x64
mkdir -p "$DIST_DIR/qamax-auth-win-x64"
mv "$DIST_DIR/$NAME-win-x64.exe" "$DIST_DIR/qamax-auth-win-x64/qamax-auth.exe"
zip -j "$DIST_DIR/qamax-auth-v$VERSION-win-x64.zip" "$DIST_DIR/qamax-auth-win-x64/qamax-auth.exe"

# Cleanup temp dirs
rm -rf "$DIST_DIR/qamax-auth-darwin-x64"
rm -rf "$DIST_DIR/qamax-auth-darwin-arm64"
rm -rf "$DIST_DIR/qamax-auth-linux-x64"
rm -rf "$DIST_DIR/qamax-auth-win-x64"

echo ""
echo "Build complete! Artifacts in $DIST_DIR/:"
ls -lh "$DIST_DIR"/*.tar.gz "$DIST_DIR"/*.zip 2>/dev/null || true
