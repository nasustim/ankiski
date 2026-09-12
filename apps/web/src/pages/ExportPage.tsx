import type { Term } from "@ankiski/core";
import {
  apkgFileName,
  collectTags,
  exportApkg,
  exportText,
  filterByDateRange,
  filterByTags,
  filterNotExported,
  liveTerms,
} from "@ankiski/core";
import { Button, Checkbox, Input, Label, NotificationBanner, SupportText } from "@ankiski/ui";
import { useId, useMemo, useState } from "react";
import { apkgRuntime } from "../lib/apkg-runtime.ts";
import { downloadBlob, downloadText } from "../lib/download.ts";
import { useSettingsStore } from "../store/settings-store.ts";
import { useVaultStore } from "../store/vault-store.ts";

function startOfDay(date: string): string | undefined {
  return date === "" ? undefined : `${date}T00:00:00.000Z`;
}

function endOfDay(date: string): string | undefined {
  return date === "" ? undefined : `${date}T23:59:59.999Z`;
}

function tsvFileName(deckName: string): string {
  return apkgFileName(deckName).replace(/\.apkg$/, ".txt");
}

export function ExportPage() {
  const vault = useVaultStore((state) => state.vault);
  const markExported = useVaultStore((state) => state.markExported);
  const defaultDeckName = useSettingsStore((state) => state.deckName);

  const [deckName, setDeckName] = useState(defaultDeckName);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyUnexported, setOnlyUnexported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [exportedIds, setExportedIds] = useState<string[] | undefined>(undefined);

  const deckId = useId();
  const fromId = useId();
  const toId = useId();

  const all = useMemo(() => liveTerms(vault), [vault]);
  const knownTags = useMemo(() => collectTags(all), [all]);

  const selection: Term[] = useMemo(() => {
    let terms = filterByTags(all, selectedTags, "any");
    terms = filterByDateRange(terms, {
      ...(startOfDay(from) === undefined ? {} : { from: startOfDay(from) as string }),
      ...(endOfDay(to) === undefined ? {} : { to: endOfDay(to) as string }),
    });
    return onlyUnexported ? filterNotExported(terms) : terms;
  }, [all, selectedTags, from, to, onlyUnexported]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleApkg() {
    setBusy(true);
    setError(undefined);
    try {
      const bytes = await exportApkg(selection, { deckName, runtime: apkgRuntime });
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/octet-stream" }),
        apkgFileName(deckName),
      );
      setExportedIds(selection.map((term) => term.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function handleTsv() {
    setError(undefined);
    downloadText(
      exportText(selection, { deckName }),
      tsvFileName(deckName),
      "text/tab-separated-values",
    );
    setExportedIds(selection.map((term) => term.id));
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-24">
      <h1 className="text-std-32B-150">書き出し</h1>

      {error ? (
        <NotificationBanner
          type="error"
          title="書き出しに失敗しました"
          onClose={() => {
            setError(undefined);
          }}
        >
          {error}
        </NotificationBanner>
      ) : null}

      <fieldset className="flex flex-col gap-16 border-0 p-0">
        <legend className="text-std-20B-160">絞り込み</legend>

        {knownTags.length > 0 ? (
          <div className="flex flex-col gap-8">
            <span className="text-std-16B-170">タグ</span>
            <div className="flex flex-wrap gap-16">
              {knownTags.map((tag) => (
                <Checkbox
                  key={tag}
                  label={tag}
                  checked={selectedTags.includes(tag)}
                  onChange={() => {
                    toggleTag(tag);
                  }}
                />
              ))}
            </div>
            <SupportText>選択しない場合はすべてのタグが対象です。</SupportText>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-16">
          <div className="flex flex-col gap-8">
            <Label htmlFor={fromId}>作成日（開始）</Label>
            <Input
              id={fromId}
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-8">
            <Label htmlFor={toId}>作成日（終了）</Label>
            <Input
              id={toId}
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
              }}
            />
          </div>
        </div>

        <Checkbox
          label="まだ書き出していない単語のみ"
          checked={onlyUnexported}
          onChange={(event) => {
            setOnlyUnexported(event.target.checked);
          }}
        />
      </fieldset>

      <div className="flex flex-col gap-8">
        <Label htmlFor={deckId}>デッキ名</Label>
        <Input
          id={deckId}
          value={deckName}
          onChange={(event) => {
            setDeckName(event.target.value);
          }}
        />
        <SupportText>`::` で階層デッキになります（例: English::Vocabulary）。</SupportText>
      </div>

      <p className="text-std-18B-160">{selection.length} 件を書き出します</p>

      <div className="flex flex-wrap gap-16">
        <Button onClick={handleApkg} disabled={busy || selection.length === 0}>
          .apkg をダウンロード
        </Button>
        <Button variant="outline" onClick={handleTsv} disabled={busy || selection.length === 0}>
          TSV をダウンロード
        </Button>
      </div>

      {exportedIds && exportedIds.length > 0 ? (
        <NotificationBanner
          type="success"
          title="ダウンロードを開始しました"
          onClose={() => {
            setExportedIds(undefined);
          }}
        >
          <div className="flex flex-col items-start gap-8">
            <p>Anki に取り込んだら、書き出し済みとして記録できます。</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                markExported(exportedIds);
                setExportedIds(undefined);
              }}
            >
              {exportedIds.length} 件を書き出し済みにする
            </Button>
          </div>
        </NotificationBanner>
      ) : null}
    </div>
  );
}
