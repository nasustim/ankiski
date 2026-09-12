import { NotificationBanner, TermForm, type TermFormValues } from "@ankiski/ui";
import { useState } from "react";
import { toTermInput } from "../lib/term-form.ts";
import { useVaultStore } from "../store/vault-store.ts";

export function AddPage() {
  const addTerm = useVaultStore((state) => state.addTerm);
  const knownTags = useVaultStore((state) => state.knownTags);
  const [added, setAdded] = useState<string | undefined>(undefined);
  // Bumped on every save so TermForm remounts with empty fields.
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(values: TermFormValues) {
    const term = addTerm(toTermInput(values));
    setAdded(term.term);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-24">
      <h1 className="text-std-32B-150">単語を追加</h1>

      {added ? (
        <NotificationBanner
          type="success"
          title={`${added} を追加しました`}
          onClose={() => {
            setAdded(undefined);
          }}
        >
          単語一覧から編集・削除できます。
        </NotificationBanner>
      ) : null}

      <TermForm key={formKey} tagSuggestions={knownTags()} onSubmit={handleSubmit} />
    </div>
  );
}
