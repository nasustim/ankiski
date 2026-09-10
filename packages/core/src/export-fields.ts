import { ENGLISH_VOCAB_FIELDS, type Term } from "./types.ts";

/** Escapes the three characters that matter for Anki's HTML-enabled fields. */
export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Escapes HTML and folds line breaks to `<br>` and tabs to a space (TSV-safe). */
export function renderText(value: string | undefined): string {
  if (value === undefined) return "";
  return escapeHtml(value)
    .replaceAll(/\r\n|\r|\n/g, "<br>")
    .replaceAll("\t", " ");
}

export function renderSource(sourceUrl: string | undefined): string {
  if (sourceUrl === undefined || sourceUrl.trim() === "") return "";
  const url = escapeHtml(sourceUrl.trim()).replaceAll(/\s/g, "");
  return `<a href="${url}">${url}</a>`;
}

/** Anki tags are whitespace-separated, so inner whitespace becomes `_`. */
export function sanitizeTag(tag: string): string {
  return tag.trim().replaceAll(/\s+/g, "_");
}

export function sanitizeTags(tags: readonly string[]): string[] {
  const out = new Set<string>();
  for (const tag of tags) {
    const clean = sanitizeTag(tag);
    if (clean !== "") out.add(clean);
  }
  return [...out];
}

/** The six ENGLISH_VOCAB_FIELDS values for a term, already HTML-rendered. */
export function renderFieldValues(term: Term): string[] {
  return ENGLISH_VOCAB_FIELDS.map((field) => {
    switch (field) {
      case "Term":
        return renderText(term.term);
      case "Reading":
        return renderText(term.reading);
      case "MeaningJa":
        return renderText(term.meaningJa);
      case "MeaningEn":
        return renderText(term.meaningEn);
      case "Example":
        return renderText(term.example);
      case "Source":
        return renderSource(term.sourceUrl);
    }
  });
}
