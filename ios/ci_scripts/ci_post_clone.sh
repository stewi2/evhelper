#!/bin/sh
set -e

echo "=== ci_post_clone: Installing Node.js and CocoaPods ==="
brew install node cocoapods

# Set NODE_BINARY for Xcode build phases (brew path varies by architecture)
NODE_PATH=$(command -v node)
echo "=== Node installed at: $NODE_PATH ==="
echo "export NODE_BINARY=$NODE_PATH" > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local"

echo "=== ci_post_clone: Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

echo "=== ci_post_clone: Running pod install ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "=== ci_post_clone: Done ==="
