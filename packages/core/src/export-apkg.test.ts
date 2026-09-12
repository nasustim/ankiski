import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import initSqlJs, { type Database } from "sql.js";
import { apkgFileName, DECK_ID, exportApkg, MODEL_ID, nodeLocateFile } from "./export-apkg.ts";
import { ENGLISH_VOCAB_FIELDS, type Term } from "./types.ts";

const iso = "2026-09-10T00:00:00.000Z";
const now = new Date("2026-09-10T12:34:56.789Z");

function term(overrides: Partial<Term> & { id: string; term: string }): Term {
  return { tags: [], createdAt: iso, updatedAt: iso, ...overrides };
}

const apple = term({
  id: "01APPLE00000000000000000000",
  term: "apple",
  reading: "æpl",
  meaningJa: "りんご",
  meaningEn: "a fruit",
  example: "I ate an apple.",
  sourceUrl: "https://example.com/apple",
  tags: ["a", "b"],
});
const run = term({ id: "01RUN0000000000000000000000", term: "run", meaningEn: "move fast" });
const gone = term({
  id: "01GONE000000000000000000000",
  term: "gone",
  meaningEn: "x",
  deletedAt: iso,
});

const terms = [apple, run, gone];
const options = { deckName: "Ankiski Test", now, runtime: { locateFile: nodeLocateFile } };

function expectedCsum(field: string): number {
  const stripped = field.replaceAll(/<[^>]+>/g, "");
  return Number.parseInt(createHash("sha1").update(stripped, "utf8").digest("hex").slice(0, 8), 16);
}

function queryAll(db: Database, sql: string): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

describe("exportApkg", () => {
  let files: Record<string, Uint8Array>;
  let db: Database;

  beforeAll(async () => {
    const bytes = await exportApkg(terms, options);
    files = unzipSync(bytes);
    const SQL = await initSqlJs({ locateFile: nodeLocateFile });
    const anki2 = files["collection.anki2"];
    if (anki2 === undefined) throw new Error("collection.anki2 missing");
    db = new SQL.Database(anki2);
  });

  afterAll(() => {
    db?.close();
  });

  it("zips exactly collection.anki2 and an empty media map", () => {
    expect(Object.keys(files).sort()).toEqual(["collection.anki2", "media"]);
    const media = files.media;
    if (media === undefined) throw new Error("media missing");
    expect(strFromU8(media)).toBe("{}");
  });

  it("writes a schema version 11 collection", () => {
    expect(queryAll(db, "SELECT ver FROM col")).toEqual([{ ver: 11 }]);
  });

  it("defines the English Vocab model with six fields and two templates", () => {
    const [row] = queryAll(db, "SELECT models, decks, conf FROM col");
    const models = JSON.parse(String(row?.models)) as Record<string, Record<string, unknown>>;
    const model = models[String(MODEL_ID)];
    expect(model).toBeDefined();
    expect(model?.name).toBe("English Vocab");
    expect(model?.id).toBe(MODEL_ID);
    const flds = model?.flds as { name: string; ord: number }[];
    expect(flds.map((f) => f.name)).toEqual([...ENGLISH_VOCAB_FIELDS]);
    expect(flds.map((f) => f.ord)).toEqual([0, 1, 2, 3, 4, 5]);
    const tmpls = model?.tmpls as { name: string; ord: number; qfmt: string }[];
    expect(tmpls.map((t) => t.name)).toEqual(["Recognition", "Recall"]);
    expect(tmpls[0]?.qfmt).toBe("{{Term}}");
    expect(tmpls[1]?.qfmt).toContain("{{#MeaningJa}}");
    expect(model?.req).toEqual([
      [0, "any", [0]],
      [1, "any", [2, 3]],
    ]);

    const decks = JSON.parse(String(row?.decks)) as Record<string, { name: string }>;
    expect(decks[String(DECK_ID)]?.name).toBe("Ankiski Test");
    expect(decks["1"]?.name).toBe("Default");

    const conf = JSON.parse(String(row?.conf)) as { curModel: string; curDeck: number };
    expect(conf.curModel).toBe(String(MODEL_ID));
  });

  it("honors a custom noteTypeName", async () => {
    const bytes = await exportApkg([run], { ...options, noteTypeName: "Custom" });
    const SQL = await initSqlJs({ locateFile: nodeLocateFile });
    const anki2 = unzipSync(bytes)["collection.anki2"];
    if (anki2 === undefined) throw new Error("missing");
    const other = new SQL.Database(anki2);
    const [row] = queryAll(other, "SELECT models FROM col");
    const models = JSON.parse(String(row?.models)) as Record<string, { name: string }>;
    expect(models[String(MODEL_ID)]?.name).toBe("Custom");
    other.close();
  });

  it("writes one note per live term and two cards per note", () => {
    expect(queryAll(db, "SELECT COUNT(*) AS n FROM notes")).toEqual([{ n: 2 }]);
    expect(queryAll(db, "SELECT COUNT(*) AS n FROM cards")).toEqual([{ n: 4 }]);
    expect(queryAll(db, `SELECT COUNT(*) AS n FROM notes WHERE guid = '${gone.id}'`)).toEqual([
      { n: 0 },
    ]);
  });

  it("fills note columns from the term", () => {
    const [note] = queryAll(db, `SELECT * FROM notes WHERE guid = '${apple.id}'`);
    expect(note).toBeDefined();
    expect(note?.mid).toBe(MODEL_ID);
    expect(note?.usn).toBe(-1);
    expect(note?.tags).toBe(" a b ");
    expect(note?.sfld).toBe("apple");
    expect(note?.flags).toBe(0);
    expect(note?.data).toBe("");
    const parts = String(note?.flds).split("\x1f");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("apple");
    expect(parts[1]).toBe("æpl");
    expect(parts[5]).toBe('<a href="https://example.com/apple">https://example.com/apple</a>');
    expect(note?.csum).toBe(expectedCsum("apple"));

    const [runNote] = queryAll(db, `SELECT * FROM notes WHERE guid = '${run.id}'`);
    expect(runNote?.tags).toBe("");
    expect(String(runNote?.flds).split("\x1f")).toEqual(["run", "", "", "move fast", "", ""]);
  });

  it("creates cards for both templates with sequential due positions", () => {
    const cards = queryAll(
      db,
      "SELECT nid, did, ord, type, queue, due, usn FROM cards ORDER BY id",
    );
    expect(cards.map((c) => c.ord)).toEqual([0, 1, 0, 1]);
    expect(cards.map((c) => c.due)).toEqual([1, 2, 3, 4]);
    expect(new Set(cards.map((c) => c.did))).toEqual(new Set([DECK_ID]));
    expect(new Set(cards.map((c) => c.type))).toEqual(new Set([0]));
    expect(new Set(cards.map((c) => c.queue))).toEqual(new Set([0]));
    expect(new Set(cards.map((c) => c.usn))).toEqual(new Set([-1]));
    const noteIds = queryAll(db, "SELECT id FROM notes ORDER BY id").map((n) => n.id);
    expect(cards.map((c) => c.nid)).toEqual([noteIds[0], noteIds[0], noteIds[1], noteIds[1]]);
  });

  it("has the expected indexes", () => {
    const names = queryAll(db, "SELECT name FROM sqlite_master WHERE type='index'").map(
      (r) => r.name,
    );
    for (const ix of [
      "ix_notes_usn",
      "ix_cards_usn",
      "ix_revlog_usn",
      "ix_cards_nid",
      "ix_cards_sched",
      "ix_revlog_cid",
      "ix_notes_csum",
    ]) {
      expect(names).toContain(ix);
    }
  });

  it("is deterministic when now is fixed", async () => {
    const SQL = await initSqlJs({ locateFile: nodeLocateFile });
    const ids: unknown[][] = [];
    for (let i = 0; i < 2; i++) {
      const bytes = await exportApkg(terms, options);
      const anki2 = unzipSync(bytes)["collection.anki2"];
      if (anki2 === undefined) throw new Error("missing");
      const other = new SQL.Database(anki2);
      ids.push(queryAll(other, "SELECT id FROM notes ORDER BY id").map((r) => r.id));
      other.close();
    }
    expect(ids[0]).toEqual(ids[1]);
    // Note and card ids share one millisecond counter: note, card, card, note, ...
    expect(ids[0]).toEqual([now.getTime(), now.getTime() + 3]);
  });
});

describe("apkgFileName", () => {
  it("slugs the deck name and appends YYYYMMDD", () => {
    expect(apkgFileName("My English Deck!", new Date("2026-09-10T23:00:00Z"))).toBe(
      "my-english-deck-20260910.apkg",
    );
    expect(apkgFileName("   ", new Date("2026-01-02T00:00:00Z"))).toBe("deck-20260102.apkg");
  });
});
