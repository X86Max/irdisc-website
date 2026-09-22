#!/usr/bin/env bash
set -euo pipefail

echo "Building IRdisC website..."
python3 build.py

echo "Updating GitHub Pages files..."
rm -rf docs
mkdir -p docs
cp -a dist/. docs/
touch docs/.nojekyll

echo "Staging changes..."
git add -A

echo
echo "Ready to publish:"
git status --short
