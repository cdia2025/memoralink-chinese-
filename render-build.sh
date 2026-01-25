#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies and build the static site
npm install
npm run build
