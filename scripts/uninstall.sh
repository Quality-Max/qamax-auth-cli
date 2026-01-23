#!/bin/bash
set -e

# QualityMax Auth CLI Uninstaller

INSTALL_DIR="/usr/local/lib/qamax"
BIN_DIR="/usr/local/bin"
CLI_NAME="qamax-auth"

echo ""
echo "  QualityMax Auth CLI Uninstaller"
echo "  ================================"
echo ""

# Check for sudo
if [ "$EUID" -ne 0 ]; then
  echo "This script requires sudo to uninstall from $INSTALL_DIR"
  exec sudo "$0" "$@"
fi

# Remove symlink
if [ -L "$BIN_DIR/$CLI_NAME" ]; then
  echo "  Removing symlink..."
  rm "$BIN_DIR/$CLI_NAME"
fi

# Remove installation directory
if [ -d "$INSTALL_DIR/qamax-auth" ]; then
  echo "  Removing installation..."
  rm -rf "$INSTALL_DIR/qamax-auth"
fi

# Remove parent if empty
if [ -d "$INSTALL_DIR" ] && [ -z "$(ls -A $INSTALL_DIR)" ]; then
  rmdir "$INSTALL_DIR"
fi

echo ""
echo "  ✓ Uninstalled successfully!"
echo ""
