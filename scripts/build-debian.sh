#!/bin/bash
set -e

# Build Rust binary
pnpm run build-rs

# Build Electron app and create Debian package
pnpm exec electron-vite build
pnpm exec electron-builder --linux deb --config electron-builder.config.cjs
