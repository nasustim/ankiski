/**
 * Pure text helpers for turning a page selection into a usable example sentence.
 * Kept free of any chrome API so it can be unit-tested in plain jsdom.
 */

/** Sentence terminators we recognise, Latin and CJK. */
const TERMINATORS = new Set([".", "!", "?", "。", "！", "？", "…", "‥"]);

/** Upper bound on the example we store, so a wall of text never lands in the form. */
const MAX_LENGTH = 400;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/**
 * A "." only ends a sentence when whitespace (or the end of the text) follows it,
 * so decimals like `3.14` and abbreviations mid-word do not split the sentence.
 */
function isBoundary(text: string, index: number): boolean {
  const char = text[index];
  if (char === undefined || !TERMINATORS.has(char)) return false;
  if (char !== ".") return true;
  const next = text[index + 1];
  return next === undefined || next === " ";
}

function clampAroundSelection(sentence: string, selectionIndex: number, selectionLength: number) {
  if (sentence.length <= MAX_LENGTH) return sentence;
  const slack = MAX_LENGTH - Math.min(selectionLength, MAX_LENGTH);
  const centered = selectionIndex - Math.floor(slack / 2);
  const latest = Math.max(0, sentence.length - MAX_LENGTH);
  const start = Math.min(Math.max(0, centered), latest);
  return sentence.slice(start, start + MAX_LENGTH).trim();
}

/**
 * Returns the sentence (or sentences) of `context` that contain `selection`.
 *
 * Whitespace is collapsed on both sides before matching, so a selection that spans
 * line breaks in the DOM still lines up with the surrounding block's text. Falls back
 * to the selection itself when the context does not contain it.
 */
export function extractSentence(context: string, selection: string): string {
  const needle = collapseWhitespace(selection);
  if (needle === "") return "";

  const haystack = collapseWhitespace(context);
  const index = haystack.indexOf(needle);
  if (index === -1) return clampAroundSelection(needle, 0, needle.length);

  let start = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (isBoundary(haystack, i)) {
      start = i + 1;
      break;
    }
  }

  let end = haystack.length;
  for (let i = index + needle.length; i < haystack.length; i += 1) {
    if (isBoundary(haystack, i)) {
      end = i + 1;
      break;
    }
  }

  const raw = haystack.slice(start, end);
  const sentence = raw.trim();
  const offset = raw.length - raw.trimStart().length;
  return clampAroundSelection(sentence, index - start - offset, needle.length);
}
