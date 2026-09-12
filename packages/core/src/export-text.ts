import { renderFieldValues, sanitizeTags } from "./export-fields.ts";
import { ENGLISH_VOCAB_FIELDS, type ExportOptions, type Term } from "./types.ts";

export const DEFAULT_NOTE_TYPE_NAME = "English Vocab";

/**
 * Builds an Anki "text file" import (TSV with `#key:value` headers).
 * Column 1 is the GUID (term.id) so re-imports update existing notes; column 8 is tags.
 * Deleted terms are skipped.
 */
export function exportText(terms: readonly Term[], options: ExportOptions): string {
  const columns = ["GUID", ...ENGLISH_VOCAB_FIELDS, "Tags"];
  const header = [
    "#separator:tab",
    "#html:true",
    `#notetype:${options.noteTypeName ?? DEFAULT_NOTE_TYPE_NAME}`,
    `#deck:${options.deckName}`,
    "#guid column:1",
    `#tags column:${columns.length}`,
    `#columns:${columns.join("\t")}`,
  ];
  const rows = terms
    .filter((term) => term.deletedAt === undefined)
    .map((term) =>
      [term.id, ...renderFieldValues(term), sanitizeTags(term.tags).join(" ")].join("\t"),
    );
  return `${[...header, ...rows].join("\n")}\n`;
}
