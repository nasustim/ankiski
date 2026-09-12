# ankiski

Serverless Anki vocabulary manager. Capture English terms from any page with a Chrome extension, manage them in a web app, export an Anki `.apkg`. No server, no accounts: data stays in browser storage.

Spec and decisions: https://github.com/nasustim/ankiski/issues/1

## Development

Tools are pinned with [mise](https://mise.jdx.dev).

```sh
mise install
bun install
bun run check      # lint + typecheck + test
bun run build
```

Layout: `packages/core` (domain, export), `packages/storage` (adapters), `packages/ui` (Digital Agency design system components), `apps/web`, `apps/extension`.

## Deployment

- **Web app** — https://nasustim.github.io/ankiski/ is deployed by `.github/workflows/deploy-web.yml` on every push to `main` that touches the web app or shared packages (also runnable by hand from the Actions tab). Set the repository variable `VITE_EXTENSION_ID` to the installed extension's ID so the deployed web app can talk to it; without it the web app runs standalone on IndexedDB.
- **Extension** — pushing a tag `v*` runs `.github/workflows/release-extension.yml`, which builds `apps/extension`, zips `dist/`, and attaches it to a GitHub Release. Install it via `chrome://extensions` → Developer mode → Load unpacked after extracting the zip. Every CI run also uploads `ankiski-extension` as a workflow artifact.

```sh
git tag v0.1.0 && git push origin v0.1.0   # release the extension
```
