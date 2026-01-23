#!/bin/bash
set -e

# QualityMax Auth CLI Installer
# Usage: curl https://cli.qamax.co/install.sh | sh

INSTALL_DIR="/usr/local/lib/qamax"
BIN_DIR="/usr/local/bin"
CLI_NAME="qamax-auth"
REPO="Quality-Max/qamax-auth-cli"
BASE_URL="https://github.com/$REPO/releases/latest/download"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "  QualityMax Auth CLI Installer"
echo "  =============================="
echo ""

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    case "$ARCH" in
      x86_64) PLATFORM="darwin-x64" ;;
      arm64)  PLATFORM="darwin-arm64" ;;
      *)      echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64) PLATFORM="linux-x64" ;;
      *)      echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  *)
    echo -e "${RED}Unsupported OS: $OS${NC}"
    echo "For Windows, download from: https://github.com/Quality-Max/qamax-rag-app/releases"
    exit 1
    ;;
esac

echo "  Detected: $OS $ARCH"
echo "  Platform: $PLATFORM"
echo ""

# Check for sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}This script requires sudo to install to $INSTALL_DIR${NC}"
  echo ""
  exec sudo "$0" "$@"
fi

# Create directories
echo "  Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Download
TARBALL_URL="$BASE_URL/qamax-auth-$PLATFORM.tar.gz"
echo "  Downloading from $TARBALL_URL..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

curl -fsSL "$TARBALL_URL" -o "$TEMP_DIR/qamax-auth.tar.gz" || {
  echo -e "${RED}Failed to download. Check your internet connection.${NC}"
  exit 1
}

# Extract
echo "  Extracting..."
tar -xzf "$TEMP_DIR/qamax-auth.tar.gz" -C "$TEMP_DIR"

# Install
echo "  Installing to $INSTALL_DIR..."
rm -rf "$INSTALL_DIR/qamax-auth"
mv "$TEMP_DIR/qamax-auth-$PLATFORM" "$INSTALL_DIR/qamax-auth"
chmod +x "$INSTALL_DIR/qamax-auth/qamax-auth"

# Create symlink
echo "  Creating symlink in $BIN_DIR..."
ln -sf "$INSTALL_DIR/qamax-auth/qamax-auth" "$BIN_DIR/$CLI_NAME"

# Verify
if command -v $CLI_NAME &> /dev/null; then
  VERSION=$($CLI_NAME --version 2>/dev/null || echo "unknown")
  echo ""
  echo -e "  ${GREEN}✓ Installed successfully!${NC}"
  echo ""
  echo "  Version: $VERSION"
  echo "  Location: $BIN_DIR/$CLI_NAME"
  echo ""
  echo "  Get started:"
  echo "    $ qamax-auth login"
  echo "    $ qamax-auth projects"
  echo "    $ qamax-auth capture https://myapp.com -p PROJECT_ID -n \"My Auth\""
  echo ""
else
  echo -e "${RED}Installation failed. Please check permissions.${NC}"
  exit 1
fi
