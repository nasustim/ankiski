import { escapeHtml, renderFieldValues, sanitizeTag } from "./export-fields.ts";
import { exportText } from "./export-text.ts";
import type { Term } from "./types.ts";

const now = "2026-09-10T00:00:00.000Z";

function term(overrides: Partial<Term> & { id: string; term: string }): Term {
  return { tags: [], createdAt: now, updatedAt: now, meaningEn: "x", ...overrides };
}

describe("export-fields helpers", () => {
  it("escapes &, <, >", () => {
    expect(escapeHtml("a<b>&c")).toBe("a&lt;b&gt;&amp;c");
  });

  it("sanitizes whitespace in tags to underscores", () => {
    expect(sanitizeTag(" part of speech ")).toBe("part_of_speech");
    expect(sanitizeTag("a\tb\nc")).toBe("a_b_c");
  });

  it("renders the six fields in ENGLISH_VOCAB_FIELDS order", () => {
    const values = renderFieldValues(
      term({
        id: "1",
        term: "a & b",
        reading: "r",
        meaningJa: "line1\nline2",
        meaningEn: "tab\there",
        example: "<i>",
        sourceUrl: "https://example.com/?q=1&r=2",
      }),
    );
    expect(values).toEqual([
      "a &amp; b",
      "r",
      "line1<br>line2",
      "tab here",
      "&lt;i&gt;",
      '<a href="https://example.com/?q=1&amp;r=2">https://example.com/?q=1&amp;r=2</a>',
    ]);
  });

  it("renders missing optionals as empty strings", () => {
    expect(renderFieldValues(term({ id: "1", term: "t" }))).toEqual(["t", "", "", "x", "", ""]);
  });
});

describe("exportText", () => {
  const terms = [
    term({
      id: "ID1",
      term: "apple",
      reading: "æpl",
      meaningJa: "りんご",
      meaningEn: "a fruit",
      example: "I ate an apple.",
      sourceUrl: "https://example.com/apple",
      tags: ["fruit", "part of speech"],
    }),
    term({ id: "ID2", term: "run", meaningEn: "move fast" }),
  ];

  it("writes Anki TSV headers", () => {
    const out = exportText(terms, { deckName: "My Deck" });
    const lines = out.split("\n");
    expect(lines.slice(0, 7)).toEqual([
      "#separator:tab",
      "#html:true",
      "#notetype:English Vocab",
      "#deck:My Deck",
      "#guid column:1",
      "#tags column:8",
      "#columns:GUID\tTerm\tReading\tMeaningJa\tMeaningEn\tExample\tSource\tTags",
    ]);
  });

  it("honors a custom noteTypeName", () => {
    expect(exportText([], { deckName: "D", noteTypeName: "Custom" })).toContain(
      "#notetype:Custom\n",
    );
  });

  it("writes one row per term with id, six fields and tags", () => {
    const out = exportText(terms, { deckName: "My Deck" });
    const rows = out.split("\n").slice(7);
    expect(rows).toEqual([
      [
        "ID1",
        "apple",
        "æpl",
        "りんご",
        "a fruit",
        "I ate an apple.",
        '<a href="https://example.com/apple">https://example.com/apple</a>',
        "fruit part_of_speech",
      ].join("\t"),
      ["ID2", "run", "", "", "move fast", "", "", ""].join("\t"),
      "",
    ]);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("escapes html and replaces newlines/tabs inside fields", () => {
    const out = exportText([term({ id: "X", term: "a<b", meaningEn: "l1\nl2\tt" })], {
      deckName: "D",
    });
    const row = out.split("\n").slice(7)[0];
    expect(row).toBe(["X", "a&lt;b", "", "", "l1<br>l2 t", "", "", ""].join("\t"));
  });

  it("skips deleted terms", () => {
    const out = exportText(
      [term({ id: "X", term: "a" }), term({ id: "Y", term: "b", deletedAt: now })],
      { deckName: "D" },
    );
    expect(out.split("\n").slice(7)).toEqual([["X", "a", "", "", "x", "", "", ""].join("\t"), ""]);
  });
});
