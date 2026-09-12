import type { SortDirection, Term, TermSortKey } from "@ankiski/core";
import { collectTags, filterByTags, liveTerms, searchTerms, sortTerms } from "@ankiski/core";
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  Label,
  Select,
  Table,
  Tag,
  Tbody,
  Td,
  TermForm,
  type TermFormValues,
  Th,
  Thead,
  Tr,
} from "@ankiski/ui";
import { useId, useMemo, useState } from "react";
import { speak, useEnglishVoices } from "../lib/speech.ts";
import { toTermFormValues, toTermInput } from "../lib/term-form.ts";
import { useSettingsStore } from "../store/settings-store.ts";
import { useVaultStore } from "../store/vault-store.ts";

const COLUMNS: { key: TermSortKey; label: string }[] = [
  { key: "term", label: "単語" },
  { key: "updatedAt", label: "更新日" },
];

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function meaningSummary(term: Term): string {
  return [term.meaningJa, term.meaningEn].filter(Boolean).join(" / ");
}

export function TermsPage() {
  const vault = useVaultStore((state) => state.vault);
  const updateTerm = useVaultStore((state) => state.updateTerm);
  const deleteTerms = useVaultStore((state) => state.deleteTerms);
  const voiceUri = useSettingsStore((state) => state.voiceUri);
  const setVoiceUri = useSettingsStore((state) => state.setVoiceUri);
  const { supported: speechAvailable, voices } = useEnglishVoices();

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<TermSortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const searchId = useId();
  const voiceId = useId();

  const all = useMemo(() => liveTerms(vault), [vault]);
  const knownTags = useMemo(() => collectTags(all), [all]);
  const rows = useMemo(
    () => sortTerms(filterByTags(searchTerms(all, query), activeTags, "all"), sortKey, sortDir),
    [all, query, activeTags, sortKey, sortDir],
  );

  const visibleIds = rows.map((term) => term.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const editing = editingId ? all.find((term) => term.id === editingId) : undefined;
  const editingValues = useMemo(() => (editing ? toTermFormValues(editing) : undefined), [editing]);

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleSort(key: TermSortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelected(selectedVisible.length === visibleIds.length ? [] : visibleIds);
  }

  function confirmDelete() {
    deleteTerms(selectedVisible);
    setSelected([]);
    setConfirmingDelete(false);
  }

  function submitEdit(values: TermFormValues) {
    if (!editingId) return;
    updateTerm(editingId, toTermInput(values));
    setEditingId(undefined);
  }

  return (
    <div className="flex flex-col gap-24">
      <h1 className="text-std-32B-150">単語一覧</h1>

      <div className="flex flex-wrap items-end gap-16">
        <div className="flex flex-col gap-8">
          <Label htmlFor={searchId}>検索</Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="単語・意味・例文"
          />
        </div>

        {speechAvailable ? (
          <div className="flex flex-col gap-8">
            <Label htmlFor={voiceId}>読み上げ音声</Label>
            <Select
              id={voiceId}
              value={voiceUri}
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
          </div>
        ) : null}

        <Button
          variant="outline"
          disabled={selectedVisible.length === 0}
          onClick={() => {
            setConfirmingDelete(true);
          }}
        >
          選択した {selectedVisible.length} 件を削除
        </Button>
      </div>

      {knownTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-8">
          <span className="text-std-16N-170">タグ:</span>
          {knownTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={activeTags.includes(tag)}
              aria-label={`タグ ${tag} で絞り込む`}
              onClick={() => {
                toggleTag(tag);
              }}
              className="rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2"
            >
              <Tag
                label={tag}
                className={activeTags.includes(tag) ? "bg-blue-900 text-white" : ""}
              />
            </button>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-std-16N-170">
          単語がまだありません。「追加」から最初の単語を登録してください。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    label=""
                    aria-label="表示中のすべての単語を選択"
                    checked={visibleIds.length > 0 && selectedVisible.length === visibleIds.length}
                    onChange={toggleSelectAll}
                  />
                </Th>
                {COLUMNS.map((column) => (
                  <Th
                    key={column.key}
                    aria-sort={
                      sortKey === column.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        toggleSort(column.key);
                      }}
                    >
                      {column.label}
                      {sortKey === column.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </Th>
                ))}
                <Th>意味</Th>
                <Th>タグ</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((term) => (
                <Tr key={term.id}>
                  <Td>
                    <Checkbox
                      label=""
                      aria-label={`${term.term} を選択`}
                      checked={selected.includes(term.id)}
                      onChange={() => {
                        toggleSelected(term.id);
                      }}
                    />
                  </Td>
                  <Td>
                    <span className="text-std-16B-170">{term.term}</span>
                    {term.reading ? (
                      <span className="block text-dns-14N-170 text-solid-gray-600">
                        {term.reading}
                      </span>
                    ) : null}
                  </Td>
                  <Td>{formatDate(term.updatedAt)}</Td>
                  <Td>{meaningSummary(term)}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-4">
                      {term.tags.map((tag) => (
                        <Tag key={tag} label={tag} />
                      ))}
                    </span>
                  </Td>
                  <Td>
                    <span className="flex gap-8">
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label={`${term.term} を編集`}
                        onClick={() => {
                          setEditingId(term.id);
                        }}
                      >
                        編集
                      </Button>
                      {speechAvailable ? (
                        <Button
                          size="xs"
                          variant="text"
                          aria-label={`${term.term} を読み上げ`}
                          onClick={() => {
                            speak(term.term, voiceUri || undefined);
                          }}
                        >
                          読み上げ
                        </Button>
                      ) : null}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      {confirmingDelete ? (
        <Dialog
          open
          onClose={() => {
            setConfirmingDelete(false);
          }}
          title="選択した単語を削除しますか？"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmingDelete(false);
                }}
              >
                キャンセル
              </Button>
              <Button onClick={confirmDelete}>削除する</Button>
            </>
          }
        >
          <p className="text-std-16N-170">
            {selectedVisible.length} 件を削除します。この操作は取り消せません。
          </p>
        </Dialog>
      ) : null}

      {editingValues ? (
        <Dialog
          open
          onClose={() => {
            setEditingId(undefined);
          }}
          title="単語を編集"
          className="w-[min(640px,90vw)]"
        >
          <TermForm
            initialValues={editingValues}
            tagSuggestions={knownTags}
            onSubmit={submitEdit}
            onCancel={() => {
              setEditingId(undefined);
            }}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
