import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Button } from "./Button.tsx";
import { ErrorText } from "./ErrorText.tsx";
import { Input } from "./Input.tsx";
import { Label, RequirementBadge } from "./Label.tsx";
import { TagInput } from "./TagInput.tsx";
import { Textarea } from "./Textarea.tsx";

export type TermFormValues = {
  term: string;
  reading: string;
  meaningJa: string;
  meaningEn: string;
  example: string;
  sourceUrl: string;
  tags: string[];
};

export type TermFormErrors = Partial<Record<keyof TermFormValues, string>>;

export type TermFormProps = {
  initialValues?: Partial<TermFormValues>;
  tagSuggestions: string[];
  onSubmit: (values: TermFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  busy?: boolean;
};

const emptyValues: TermFormValues = {
  term: "",
  reading: "",
  meaningJa: "",
  meaningEn: "",
  example: "",
  sourceUrl: "",
  tags: [],
};

function mergeInitialValues(initialValues?: Partial<TermFormValues>): TermFormValues {
  return { ...emptyValues, ...initialValues };
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateTermForm(values: TermFormValues): TermFormErrors {
  const errors: TermFormErrors = {};

  if (!values.term.trim()) {
    errors.term = "単語を入力してください";
  }

  if (!values.meaningJa.trim() && !values.meaningEn.trim()) {
    errors.meaningJa = "日本語または英語の意味を入力してください";
    errors.meaningEn = "日本語または英語の意味を入力してください";
  }

  if (values.sourceUrl.trim() && !isValidHttpUrl(values.sourceUrl.trim())) {
    errors.sourceUrl = "http または https の URL を入力してください";
  }

  return errors;
}

export function TermForm({
  initialValues,
  tagSuggestions,
  onSubmit,
  onCancel,
  submitLabel = "保存",
  busy = false,
}: TermFormProps) {
  const [values, setValues] = useState<TermFormValues>(() => mergeInitialValues(initialValues));
  const [errors, setErrors] = useState<TermFormErrors>({});

  useEffect(() => {
    setValues(mergeInitialValues(initialValues));
    setErrors({});
    // Re-seed whenever the serialized contents change (e.g. an async popup prefill), not on
    // every render, since callers often pass a fresh initialValues object each time.
  }, [initialValues]);

  const termId = useId();
  const readingId = useId();
  const meaningJaId = useId();
  const meaningEnId = useId();
  const exampleId = useId();
  const sourceUrlId = useId();
  const tagsId = useId();

  const termErrorId = `${termId}-error`;
  const meaningJaErrorId = `${meaningJaId}-error`;
  const meaningEnErrorId = `${meaningEnId}-error`;
  const sourceUrlErrorId = `${sourceUrlId}-error`;

  function updateField<K extends keyof TermFormValues>(field: K, value: TermFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed: TermFormValues = {
      term: values.term.trim(),
      reading: values.reading.trim(),
      meaningJa: values.meaningJa.trim(),
      meaningEn: values.meaningEn.trim(),
      example: values.example.trim(),
      sourceUrl: values.sourceUrl.trim(),
      tags: values.tags,
    };

    const nextErrors = validateTermForm(trimmed);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    void onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-24">
      <div className="flex flex-col gap-8">
        <Label htmlFor={termId}>
          単語
          <RequirementBadge required />
        </Label>
        <Input
          id={termId}
          value={values.term}
          onChange={(event) => updateField("term", event.target.value)}
          isError={Boolean(errors.term)}
          aria-describedby={errors.term ? termErrorId : undefined}
        />
        {errors.term ? <ErrorText id={termErrorId}>{errors.term}</ErrorText> : null}
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={readingId}>
          読み / 発音
          <RequirementBadge />
        </Label>
        <Input
          id={readingId}
          value={values.reading}
          onChange={(event) => updateField("reading", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={meaningJaId}>
          意味（日本語）
          <RequirementBadge />
        </Label>
        <Textarea
          id={meaningJaId}
          value={values.meaningJa}
          onChange={(event) => updateField("meaningJa", event.target.value)}
          isError={Boolean(errors.meaningJa)}
          aria-describedby={errors.meaningJa ? meaningJaErrorId : undefined}
        />
        {errors.meaningJa ? <ErrorText id={meaningJaErrorId}>{errors.meaningJa}</ErrorText> : null}
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={meaningEnId}>
          意味（英語）
          <RequirementBadge />
        </Label>
        <Textarea
          id={meaningEnId}
          value={values.meaningEn}
          onChange={(event) => updateField("meaningEn", event.target.value)}
          isError={Boolean(errors.meaningEn)}
          aria-describedby={errors.meaningEn ? meaningEnErrorId : undefined}
        />
        {errors.meaningEn ? <ErrorText id={meaningEnErrorId}>{errors.meaningEn}</ErrorText> : null}
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={exampleId}>
          例文
          <RequirementBadge />
        </Label>
        <Textarea
          id={exampleId}
          value={values.example}
          onChange={(event) => updateField("example", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={sourceUrlId}>
          出典 URL
          <RequirementBadge />
        </Label>
        <Input
          id={sourceUrlId}
          type="url"
          value={values.sourceUrl}
          onChange={(event) => updateField("sourceUrl", event.target.value)}
          isError={Boolean(errors.sourceUrl)}
          aria-describedby={errors.sourceUrl ? sourceUrlErrorId : undefined}
        />
        {errors.sourceUrl ? <ErrorText id={sourceUrlErrorId}>{errors.sourceUrl}</ErrorText> : null}
      </div>

      <div className="flex flex-col gap-8">
        <Label htmlFor={tagsId}>
          タグ
          <RequirementBadge />
        </Label>
        <TagInput
          id={tagsId}
          value={values.tags}
          onChange={(tags) => updateField("tags", tags)}
          suggestions={tagSuggestions}
        />
      </div>

      <div className="flex justify-end gap-12">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            キャンセル
          </Button>
        ) : null}
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
