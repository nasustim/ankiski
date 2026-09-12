# @ankiski/web

ankiski の Web アプリ（Vite + React 19 + React Router + Zustand）。
GitHub Pages の `https://nasustim.github.io/ankiski/` で配信する想定のため、`base` は `/ankiski/` 固定です。

## ページ

| パス | 内容 |
| --- | --- |
| `/` | 単語一覧。検索・タグ絞り込み・並び替え・一括削除・ダイアログでのインライン編集・読み上げ |
| `/add` | 単語の追加 |
| `/export` | タグ / 作成日 / 未書き出し で絞り込んで `.apkg`（副次的に TSV）をダウンロード、書き出し済みの記録 |
| `/settings` | 保存先の表示、`vault.json` の書き出し / 読み込み、既定のデッキ名・読み上げ音声 |

## コマンド

すべて bun で実行します（npm / pnpm は使いません）。bun が無い場合は `mise exec -- bun ...`。

```sh
bun install          # リポジトリルートで一度だけ
bun run dev          # 開発サーバ (http://localhost:5173/ankiski/)
bun run typecheck    # tsc --noEmit
bun run test         # Vitest + Testing Library
bun run build        # dist/ を生成
bunx vite preview    # ビルド成果物の確認
```

## 環境変数

| 変数 | 既定 | 説明 |
| --- | --- | --- |
| `VITE_EXTENSION_ID` | なし | Chrome 拡張機能の ID。指定すると起動時に拡張機能を検出し、見つかれば `chrome.storage`（extension-bridge）を保存先に使います。未指定・未検出なら IndexedDB にフォールバックします。 |

```sh
echo 'VITE_EXTENSION_ID=<拡張機能のID>' > .env.local
```

`.env.local` は git 管理外です。拡張機能側の `externally_connectable` に、このアプリのオリジンが登録されている必要があります。

## 保存先

`@ankiski/storage` の `selectStorage()` が以下の順で選びます。

1. `extension-bridge` — `VITE_EXTENSION_ID` が設定され、拡張機能が応答した場合
2. `indexeddb` — 通常のブラウザ
3. `memory` — IndexedDB が使えない場合（タブを閉じると消えます）

変更は約 500ms のデバウンスをかけてアダプタへ保存されます。アダプタからの変更通知（拡張機能側での追加など）も購読しています。

## `.apkg` の書き出し

`@ankiski/core` の `exportApkg()` が sql.js（WebAssembly）と fflate でブラウザ内だけで生成します。
wasm は `src/lib/apkg-runtime.ts` で `sql.js/dist/sql-wasm.wasm?url` として取り込んでいるので、Vite がビルド資産として出力し、`/ankiski/` 配下でも正しく解決されます。
