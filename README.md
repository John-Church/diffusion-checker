# Diffusion Grammar Checker

Automatically correct spelling and grammar using a diffusion text model. Diffusion models are significantly faster and cheaper than traditional LLMs and so make for great spelling and grammar checkers.

In addition to being much faster than needing to manually go back and correct spell-checked words, AI spellchecking offers a few other advantages. 
1. You have much greater control over what is corrected. You can note, for example, that you are writing with an embellished accent on purpose or that you prefer never to use an oxford comma.
2. Automatically correct grammar as well as spelling
3. You can add creative instructions, such as to translate to X language so that you can write in a language you are fluent in but review the written content in the language you need to write in but are less confident in. 

## Features

- **Auto-correction**: Automatically corrects content whenever you complete a paragraph or move your cursor from a section
- **Manual correction**: Use the command palette to correct the current paragraph
- **Status bar toggle**: Click the status bar item to quickly enable/disable auto-correction
- **Customizable prompts**: Edit the system prompt to customize correction behavior



https://github.com/user-attachments/assets/9f7a1839-5271-435b-9a07-7de84ef3d36c



## Usage

- Write normally in your notes
- When you press Enter after a paragraph, it will automatically be checked and corrected
- Click the "✓ Grammar" / "✗ Grammar" indicator in the status bar to toggle auto-correction
- Use the command palette to manually correct the current paragraph
- Edit the system prompt in the plugin settings to add custom instructions.

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

## Manual Installation

1. Run `bun build` and copy `main.js` and `manifest.json` to your vault's `.obsidian/plugins/diffusion-checker/` folder or run `./scripts/deploy-local.sh /path/to/your/vault` to both build and move the files.
2. Reload Obsidian
3. Enable the plugin in Settings → Community plugins
4. Add your Inception Labs API key in the plugin settings
