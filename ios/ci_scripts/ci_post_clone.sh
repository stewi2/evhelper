#!/bin/sh
set -e

echo "=== ci_post_clone: Installing Node.js and CocoaPods ==="
brew install node cocoapods

echo "=== ci_post_clone: Installing Node.js dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

echo "=== ci_post_clone: Running pod install ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "=== ci_post_clone: Done ==="
