# Diffusion Grammar Checker

An Obsidian plugin that automatically corrects spelling and grammar using a diffusion model API.

## Features

- **Auto-correction**: Automatically corrects paragraphs when you press Enter
- **Manual correction**: Use the command palette to correct the current paragraph
- **Visual feedback**: Text briefly turns italic and colored while being checked
- **Status bar toggle**: Click the status bar item to quickly enable/disable auto-correction
- **Customizable prompts**: Edit the system prompt to customize correction behavior

## Installation

1. Copy `main.js` and `manifest.json` to your vault's `.obsidian/plugins/diffusion-grammar-checker/` folder
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
```
