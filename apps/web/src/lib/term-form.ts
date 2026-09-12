import type { Term, TermInput } from "@ankiski/core";
import type { TermFormValues } from "@ankiski/ui";

/** Term -> form values. The form works in plain strings, so absent fields become "". */
export function toTermFormValues(term: Term): TermFormValues {
  return {
    term: term.term,
    reading: term.reading ?? "",
    meaningJa: term.meaningJa ?? "",
    meaningEn: term.meaningEn ?? "",
    example: term.example ?? "",
    sourceUrl: term.sourceUrl ?? "",
    tags: term.tags,
  };
}

/**
 * Form values -> core input. Blank strings are kept on purpose: createTerm drops them and
 * updateTerm treats them as "clear this field".
 */
export function toTermInput(values: TermFormValues): TermInput {
  return {
    term: values.term,
    reading: values.reading,
    meaningJa: values.meaningJa,
    meaningEn: values.meaningEn,
    example: values.example,
    sourceUrl: values.sourceUrl,
    tags: values.tags,
  };
}
