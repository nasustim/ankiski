# ankiski

Serverless Anki vocabulary manager. Capture English terms from any page with a Chrome extension, manage them in a web app, export an Anki `.apkg`. No server, no accounts: data stays in browser storage.

Spec and decisions: https://github.com/nasustim/anki/issues/1

## Development

Tools are pinned with [mise](https://mise.jdx.dev).

```sh
mise install
bun install
bun run check      # lint + typecheck + test
bun run build
```

Layout: `packages/core` (domain, export), `packages/storage` (adapters), `packages/ui` (Digital Agency design system components), `apps/web`, `apps/extension`.

GitHub Pages deployment is manual-only and not enabled yet.
