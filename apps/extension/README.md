# @ankiski/extension

The ankiski Chrome extension (Manifest V3). It owns the vault: everything lives in
`chrome.storage.local`, and the web app reads and writes it over the
`externally_connectable` bridge.

Built with Vite 8 + [@crxjs/vite-plugin](https://crxjs.dev/), React 19, and the
Digital Agency design system via `@ankiski/ui`.

## Commands

All commands use **bun** (never npm or pnpm). If `bun` is not on your PATH, prefix
them with `mise exec --`.

```sh
bun run dev        # Vite dev server with HMR; writes an unpacked build to dist/
bun run build      # production build into dist/
bun run typecheck  # tsc --noEmit
bun run test       # vitest run
```

## Load unpacked

1. `bun run build` (or `bun run dev` to keep hot reload while you work).
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose `apps/extension/dist`.
5. The ankiski icon appears in the toolbar. Pin it if you want the badge visible.

Re-running `bun run build` updates `dist/` in place; click the reload arrow on the
extension card to pick up the new build. With `bun run dev`, CRXJS reloads it for you.

## Finding the extension ID (for `VITE_EXTENSION_ID`)

The web app talks to the extension by ID, which it reads from `VITE_EXTENSION_ID`.
An unpacked extension gets an ID derived from its directory path, so it stays stable
on your machine but differs between machines.

1. Open `chrome://extensions` with Developer mode on.
2. Find the **ankiski** card. The ID is the 32-character string under the name
   (for example `abcdefghijklmnopabcdefghijklmnop`).
3. Put it in `apps/web/.env.local`:

   ```sh
   VITE_EXTENSION_ID=abcdefghijklmnopabcdefghijklmnop
   ```

Without it the web app falls back to its standalone IndexedDB storage.

To keep the same ID across machines, add a `key` field to `manifest.config.ts`
(the public half of a generated key pair) — not needed for local development.

## What the pieces do

| Path | Role |
| --- | --- |
| `manifest.config.ts` | MV3 manifest via CRXJS `defineManifest` |
| `src/background/service-worker.ts` | Wires every listener; the only stateful piece |
| `src/background/capture.ts` | Context menu + selection capture, injected into the page |
| `src/background/sentence.ts` | `extractSentence()` — pure, unit-tested |
| `src/background/badge.ts` | Toolbar badge = live terms not yet exported |
| `src/shared/draft.ts` | Hands a capture from the context menu to the popup |
| `src/shared/settings.ts` | Web app URL, in `chrome.storage.sync` |
| `src/popup/` | Add-a-term popup (400px wide) |
| `src/options/` | Settings, stats, and `vault.json` export / import |
| `src/testing/chrome-mock.ts` | Fake `chrome` for the tests |

## Permissions, and why

- `contextMenus` — the "Add to ankiski" entry on selected text.
- `storage` + `unlimitedStorage` — the vault itself.
- `activeTab` + `scripting` — read the sentence around the selection, only on the tab
  you right-clicked, only at that moment. There are no host permissions, so the
  extension cannot read pages you have not acted on.

## Keyboard shortcut

`Alt+Shift+A` opens the popup. Chrome lets the user rebind it at
`chrome://extensions/shortcuts`.
