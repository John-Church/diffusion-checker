# Diffusion Grammar Checker

Automatically correct spelling and grammar using a diffusion text model. Diffusion models are significantly faster and cheaper than traditional LLMs and so make for great spelling and grammar checkers.

## Features

- **Auto-correction**: Automatically corrects content whenever you complete a paragraph or move your cursor from a section
- **Manual correction**: Use the command palette to correct the current paragraph
- **Status bar toggle**: Click the status bar item to quickly enable/disable auto-correction
- **Customizable prompts**: Edit the system prompt to customize correction behavior

## Manual Installation

1. Run `bun build` and copy `main.js` and `manifest.json` to your vault's `.obsidian/plugins/diffusion-checker/` folder or run `./scripts/deploy-local.sh /path/to/your/vault` to both build and move the files.
2. Reload Obsidian
3. Enable the plugin in Settings → Community plugins
4. Add your Inception Labs API key in the plugin settings

## Usage

- Write normally in your notes
- When you press Enter after a paragraph, it will automatically be checked and corrected
- Click the "✓ Grammar" / "✗ Grammar" indicator in the status bar to toggle auto-correction
- Use the command palette to manually correct the current paragraph

## Development

```bash
# Install dependencies
bun install

# Development build with watch mode
bun run dev

# Production build
bun run build

# Type check
bun run typecheck

# Deploy to local vault (for development)
./scripts/deploy-local.sh /path/to/your/vault
# Or set OBSIDIAN_VAULT_PATH in .env file and run:
./scripts/deploy-local.sh
```
