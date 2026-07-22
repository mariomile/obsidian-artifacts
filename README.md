# Artifacts

View, embed, and screenshot self-contained HTML artifacts inside Obsidian.

Consolidates three previously-separate plugins into one:
- Standalone tab view for `.html`/`.htm` files (default reader)
- Inline embedding via `![[artifact.html]]`
- Auto-reload when the source file changes
- Desktop-only "Screenshot artifact to PNG" command

## Development

```bash
pnpm install
pnpm dev     # watch build, deploys to the path in .obsidian-plugin-dir
pnpm build   # production build
pnpm test    # unit tests (pure logic only)
```
