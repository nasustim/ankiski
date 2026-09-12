import type { StorageAdapter, Term, Vault } from "@ankiski/core";
import { collectTags, createTerm, liveTerms, sortTerms, upsertTerm } from "@ankiski/core";
import type { TermFormValues } from "@ankiski/ui";
import { NotificationBanner, TermForm } from "@ankiski/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Draft } from "../shared/draft.ts";
import { takeDraft } from "../shared/draft.ts";
import { DEFAULT_WEB_APP_URL, loadSettings } from "../shared/settings.ts";
import type { StorageLike } from "../shared/storage-area.ts";

const RECENT_COUNT = 5;

export type PopupProps = {
  adapter: StorageAdapter;
  storage: StorageLike;
};

function draftToInitialValues(draft: Draft | null): Partial<TermFormValues> {
  if (!draft) return {};
  return { term: draft.term, example: draft.example, sourceUrl: draft.sourceUrl };
}

function recentTerms(vault: Vault | null): Term[] {
  if (!vault) return [];
  return sortTerms(liveTerms(vault), "createdAt", "desc").slice(0, RECENT_COUNT);
}

export function Popup({ adapter, storage }: PopupProps) {
  const [vault, setVault] = useState<Vault | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [webAppUrl, setWebAppUrl] = useState(DEFAULT_WEB_APP_URL);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        // The draft is consumed here on purpose: reopening the popup starts blank.
        const [loaded, pending, settings] = await Promise.all([
          adapter.load(),
          takeDraft(storage),
          loadSettings(storage),
        ]);
        if (cancelled) return;
        setVault(loaded);
        setDraft(pending);
        setWebAppUrl(settings.webAppUrl);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [adapter, storage]);

  const initialValues = useMemo(() => draftToInitialValues(draft), [draft]);
  const tagSuggestions = useMemo(() => (vault ? collectTags(liveTerms(vault)) : []), [vault]);
  const recent = useMemo(() => recentTerms(vault), [vault]);

  const handleSubmit = useCallback(
    async (values: TermFormValues) => {
      if (!vault) return;
      setError(null);
      try {
        const term = createTerm({
          term: values.term,
          reading: values.reading,
          meaningJa: values.meaningJa,
          meaningEn: values.meaningEn,
          example: values.example,
          sourceUrl: values.sourceUrl,
          tags: values.tags,
        });
        const next = upsertTerm(vault, term);
        await adapter.save(next);
        setVault(next);
        setDraft(null);
        setSaved(term.term);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [adapter, vault],
  );

  return (
    <main className="flex w-[400px] flex-col gap-16 p-16">
      <header className="flex items-baseline justify-between gap-8">
        <h1 className="text-std-20B-150">ankiski</h1>
        <a
          href={webAppUrl}
          target="_blank"
          rel="noreferrer"
          className="text-std-14B-170 text-blue-900 underline"
        >
          ankiski を開く
        </a>
      </header>

      {saved ? (
        <NotificationBanner type="success" title="保存しました" onClose={() => setSaved(null)}>
          {`「${saved}」を単語帳に追加しました。`}
        </NotificationBanner>
      ) : null}

      {error ? (
        <NotificationBanner
          type="error"
          title="保存できませんでした"
          onClose={() => setError(null)}
        >
          {error}
        </NotificationBanner>
      ) : null}

      {vault ? (
        <TermForm
          key={draft?.createdAt ?? "blank"}
          initialValues={initialValues}
          tagSuggestions={tagSuggestions}
          onSubmit={handleSubmit}
        />
      ) : (
        <p className="text-std-16N-170">読み込み中…</p>
      )}

      <section className="flex flex-col gap-8 border-t border-solid border-border-divider pt-16">
        <h2 className="text-std-16B-170">最近追加した単語</h2>
        {recent.length === 0 ? (
          <p className="text-std-14N-170 text-gray-700">まだ単語がありません。</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {recent.map((term) => (
              <li key={term.id} className="flex items-baseline justify-between gap-8">
                <span className="text-std-14B-170">{term.term}</span>
                <span className="truncate text-std-14N-170 text-gray-700">
                  {term.meaningJa ?? term.meaningEn ?? ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
