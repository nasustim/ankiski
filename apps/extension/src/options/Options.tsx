import type { StorageAdapter, Vault } from "@ankiski/core";
import { filterNotExported, liveTerms } from "@ankiski/core";
import { importVaultJson, serializeVault, vaultFileName } from "@ankiski/storage";
import { Button, Input, Label, NotificationBanner, SupportText } from "@ankiski/ui";
import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";
import { downloadTextFile } from "../shared/download.ts";
import { DEFAULT_WEB_APP_URL, loadSettings, saveSettings } from "../shared/settings.ts";
import type { StorageLike } from "../shared/storage-area.ts";

export type OptionsProps = {
  adapter: StorageAdapter;
  storage: StorageLike;
};

type Notice = { type: "success" | "error"; title: string; detail?: string };

export function Options({ adapter, storage }: OptionsProps) {
  const [vault, setVault] = useState<Vault | null>(null);
  const [webAppUrl, setWebAppUrl] = useState(DEFAULT_WEB_APP_URL);
  const [notice, setNotice] = useState<Notice | null>(null);
  const urlId = useId();
  const importId = useId();

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const [loaded, settings] = await Promise.all([adapter.load(), loadSettings(storage)]);
      if (cancelled) return;
      setVault(loaded);
      setWebAppUrl(settings.webAppUrl);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [adapter, storage]);

  async function handleSaveUrl() {
    await saveSettings({ webAppUrl }, storage);
    const stored = await loadSettings(storage);
    setWebAppUrl(stored.webAppUrl);
    setNotice(
      stored.webAppUrl === webAppUrl
        ? { type: "success", title: "設定を保存しました" }
        : {
            type: "error",
            title: "URL が正しくありません",
            detail: "http または https の URL を入力してください。既定値に戻しました。",
          },
    );
  }

  function handleExport() {
    if (!vault) return;
    downloadTextFile(serializeVault(vault), vaultFileName());
    setNotice({ type: "success", title: "vault.json を書き出しました" });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !vault) return;
    try {
      const { merged, imported } = importVaultJson(vault, await file.text());
      await adapter.save(merged);
      setVault(merged);
      setNotice({
        type: "success",
        title: "vault.json を読み込みました",
        detail: `${imported} 件の単語を取り込みました。`,
      });
    } catch (cause) {
      setNotice({
        type: "error",
        title: "読み込みに失敗しました",
        detail: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  const live = vault ? liveTerms(vault) : [];
  const pending = filterNotExported(live);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-32 p-24">
      <h1 className="text-std-24B-150">ankiski の設定</h1>

      {notice ? (
        <NotificationBanner type={notice.type} title={notice.title} onClose={() => setNotice(null)}>
          {notice.detail}
        </NotificationBanner>
      ) : null}

      <section className="flex flex-col gap-8">
        <h2 className="text-std-20B-150">単語帳の状況</h2>
        <dl className="flex gap-32">
          <div className="flex flex-col gap-4">
            <dt className="text-std-14N-170 text-gray-700">登録済みの単語</dt>
            <dd className="text-std-20B-150">{live.length}</dd>
          </div>
          <div className="flex flex-col gap-4">
            <dt className="text-std-14N-170 text-gray-700">未書き出しの単語</dt>
            <dd className="text-std-20B-150">{pending.length}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-std-20B-150">Web アプリの URL</h2>
        <Label htmlFor={urlId}>ankiski を開くリンク先</Label>
        <Input
          id={urlId}
          type="url"
          value={webAppUrl}
          onChange={(event) => setWebAppUrl(event.target.value)}
        />
        <SupportText>{`既定値: ${DEFAULT_WEB_APP_URL}`}</SupportText>
        <div>
          <Button onClick={() => void handleSaveUrl()}>URL を保存</Button>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-std-20B-150">バックアップ</h2>
        <SupportText>
          vault.json は端末間の移行やバックアップに使えます。読み込みは id
          ごとに更新日時が新しい方を採用してマージします。
        </SupportText>
        <div className="flex flex-wrap items-center gap-16">
          <Button variant="outline" onClick={handleExport} disabled={vault === null}>
            vault.json を書き出す
          </Button>
          <div className="flex flex-col gap-4">
            <Label htmlFor={importId}>vault.json を読み込む</Label>
            <input
              id={importId}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImport(event)}
              className="text-std-16N-170"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
