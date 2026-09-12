import type { SelectStorageMode } from "@ankiski/storage";
import { vaultFileName } from "@ankiski/storage";
import { Button, Input, Label, NotificationBanner, Select, SupportText } from "@ankiski/ui";
import { useId, useState } from "react";
import { downloadText } from "../lib/download.ts";
import { useEnglishVoices } from "../lib/speech.ts";
import { useSettingsStore } from "../store/settings-store.ts";
import { useVaultStore } from "../store/vault-store.ts";

const REPO_URL = "https://github.com/nasustim/ankiski";

const MODE_LABELS: Record<SelectStorageMode, string> = {
  "extension-bridge": "拡張機能（chrome.storage）",
  indexeddb: "このブラウザ（IndexedDB）",
  memory: "メモリ（一時保存）",
};

const MODE_DESCRIPTIONS: Record<SelectStorageMode, string> = {
  "extension-bridge":
    "Chrome 拡張機能が保存先です。拡張機能をアンインストールするとデータは失われます。",
  indexeddb: "このブラウザのプロファイル内にのみ保存されます。他の端末とは共有されません。",
  memory: "保存先が利用できないため、タブを閉じるとデータは失われます。",
};

export function SettingsPage() {
  const vault = useVaultStore((state) => state.vault);
  const mode = useVaultStore((state) => state.mode);
  const exportJson = useVaultStore((state) => state.exportJson);
  const importJson = useVaultStore((state) => state.importJson);

  const deckName = useSettingsStore((state) => state.deckName);
  const setDeckName = useSettingsStore((state) => state.setDeckName);
  const voiceUri = useSettingsStore((state) => state.voiceUri);
  const setVoiceUri = useSettingsStore((state) => state.setVoiceUri);
  const { supported: speechAvailable, voices } = useEnglishVoices();

  const [imported, setImported] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const deckId = useId();
  const voiceId = useId();
  const fileId = useId();

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setImported(undefined);
    try {
      setImported(await importJson(await file.text()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-32">
      <h1 className="text-std-32B-150">設定</h1>

      <section className="flex flex-col gap-8">
        <h2 className="text-std-20B-160">保存先</h2>
        <p className="text-std-16N-170">
          <span className="inline-block rounded-full border border-blue-900 px-12 py-4 text-std-16B-170 text-blue-900">
            {mode ? MODE_LABELS[mode] : "確認中…"}
          </span>
        </p>
        {mode ? <SupportText>{MODE_DESCRIPTIONS[mode]}</SupportText> : null}
        <p className="text-std-16N-170">登録済み: {vault.terms.length} 件</p>

        {mode === "extension-bridge" ? (
          <NotificationBanner type="warning" title="定期的にバックアップしてください">
            拡張機能を削除するとデータも消えます。vault.json
            をダウンロードして保管することをおすすめします。
          </NotificationBanner>
        ) : null}
      </section>

      <section className="flex flex-col gap-16">
        <h2 className="text-std-20B-160">バックアップ</h2>

        {imported !== undefined ? (
          <NotificationBanner
            type="success"
            title={`${imported} 件を取り込みました`}
            onClose={() => {
              setImported(undefined);
            }}
          />
        ) : null}
        {error ? (
          <NotificationBanner
            type="error"
            title="vault.json を読み込めません"
            onClose={() => {
              setError(undefined);
            }}
          >
            {error}
          </NotificationBanner>
        ) : null}

        <div>
          <Button
            variant="outline"
            onClick={() => {
              downloadText(exportJson(), vaultFileName());
            }}
          >
            vault.json をダウンロード
          </Button>
        </div>

        <div className="flex flex-col gap-8">
          <Label htmlFor={fileId}>vault.json を読み込む</Label>
          <input
            id={fileId}
            type="file"
            accept="application/json,.json"
            className="text-std-16N-170"
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <SupportText>
            同じ id の単語は updatedAt が新しい方が残ります。削除も引き継がれます。
          </SupportText>
        </div>
      </section>

      <section className="flex flex-col gap-16">
        <h2 className="text-std-20B-160">既定値</h2>

        <div className="flex flex-col gap-8">
          <Label htmlFor={deckId}>既定のデッキ名</Label>
          <Input
            id={deckId}
            value={deckName}
            onChange={(event) => {
              setDeckName(event.target.value);
            }}
          />
        </div>

        <div className="flex flex-col gap-8">
          <Label htmlFor={voiceId}>読み上げ音声</Label>
          <Select
            id={voiceId}
            value={voiceUri}
            disabled={!speechAvailable}
            onChange={(event) => {
              setVoiceUri(event.target.value);
            }}
          >
            <option value="">自動選択</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </Select>
          {speechAvailable ? null : (
            <SupportText>このブラウザは音声読み上げに対応していません。</SupportText>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-std-20B-160">このアプリについて</h2>
        <p className="text-std-16N-170">
          <a className="text-blue-900 underline" href={REPO_URL} rel="noreferrer" target="_blank">
            GitHub リポジトリ (nasustim/ankiski)
          </a>
        </p>
      </section>
    </div>
  );
}
