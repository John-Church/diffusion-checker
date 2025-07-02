#!/bin/bash

# Local deployment script for development
# Usage: ./scripts/deploy-local.sh [vault-path]

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

VAULT_PATH="${1:-$OBSIDIAN_VAULT_PATH}"

if [ -z "$VAULT_PATH" ]; then
    echo "Error: No vault path provided"
    echo "Usage: ./scripts/deploy-local.sh /path/to/vault"
    echo "Or set OBSIDIAN_VAULT_PATH in your .env file"
    exit 1
fi

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/diffusion-grammar-checker"

echo "Building plugin..."
bun run build

echo "Creating plugin directory..."
mkdir -p "$PLUGIN_DIR"

echo "Copying files to $PLUGIN_DIR..."
cp build/main.js build/manifest.json "$PLUGIN_DIR/"

echo "Deployment complete!"