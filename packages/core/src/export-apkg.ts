import { strToU8, zipSync } from "fflate";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { renderFieldValues, sanitizeTags } from "./export-fields.ts";
import { DEFAULT_NOTE_TYPE_NAME } from "./export-text.ts";
import { ENGLISH_VOCAB_FIELDS, type ExportOptions, type Term } from "./types.ts";

/** Fixed ids so re-imports update the existing note type / deck instead of duplicating. */
export const MODEL_ID = 1694321600000;
export const DECK_ID = 1694321600001;

/** Legacy collection schema every Anki client (desktop, AnkiDroid, AnkiMobile) still imports. */
export const ANKI_SCHEMA_VERSION = 11;

/**
 * How to reach the sql.js wasm. Browsers pass e.g.
 * `locateFile: (f) => new URL(\`sql.js/dist/${f}\`, import.meta.url).href`;
 * node tests use {@link nodeLocateFile}.
 */
export type ApkgRuntime = {
  locateFile?: (file: string) => string;
  /** Override sql.js initialisation entirely (tests, custom bundling). */
  sqlJsFactory?: (runtime: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;
};

export type ExportApkgOptions = ExportOptions & {
  now?: Date;
  runtime?: ApkgRuntime;
};

/** Resolves sql.js dist files from node_modules. Only valid under node. */
export function nodeLocateFile(file: string): string {
  // Lazy so bundlers targeting the browser never see `node:module`.
  const req = globalThis.process?.getBuiltinModule?.("node:module") as
    | { createRequire: (url: string) => { resolve: (id: string) => string } }
    | undefined;
  if (req === undefined) throw new Error("nodeLocateFile requires node");
  return req.createRequire(import.meta.url).resolve(`sql.js/dist/${file}`);
}

let cachedSql: Promise<SqlJsStatic> | undefined;

async function loadSqlJs(runtime: ApkgRuntime): Promise<SqlJsStatic> {
  if (runtime.sqlJsFactory !== undefined) {
    return runtime.sqlJsFactory(runtime.locateFile ? { locateFile: runtime.locateFile } : {});
  }
  const locateFile =
    runtime.locateFile ?? (typeof window === "undefined" ? nodeLocateFile : undefined);
  cachedSql ??= initSqlJs(locateFile ? { locateFile } : {});
  return cachedSql;
}

const SCHEMA_SQL = `
CREATE TABLE col (
  id integer primary key,
  crt integer not null,
  mod integer not null,
  scm integer not null,
  ver integer not null,
  dty integer not null,
  usn integer not null,
  ls integer not null,
  conf text not null,
  models text not null,
  decks text not null,
  dconf text not null,
  tags text not null
);
CREATE TABLE notes (
  id integer primary key,
  guid text not null,
  mid integer not null,
  mod integer not null,
  usn integer not null,
  tags text not null,
  flds text not null,
  sfld integer not null,
  csum integer not null,
  flags integer not null,
  data text not null
);
CREATE TABLE cards (
  id integer primary key,
  nid integer not null,
  did integer not null,
  ord integer not null,
  mod integer not null,
  usn integer not null,
  type integer not null,
  queue integer not null,
  due integer not null,
  ivl integer not null,
  factor integer not null,
  reps integer not null,
  lapses integer not null,
  left integer not null,
  odue integer not null,
  odid integer not null,
  flags integer not null,
  data text not null
);
CREATE TABLE revlog (
  id integer primary key,
  cid integer not null,
  usn integer not null,
  ease integer not null,
  ivl integer not null,
  lastIvl integer not null,
  factor integer not null,
  time integer not null,
  type integer not null
);
CREATE TABLE graves (
  usn integer not null,
  oid integer not null,
  type integer not null
);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

const LATEX_PRE =
  "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n";
const LATEX_POST = "\\end{document}";

const CARD_CSS = `.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif;
  font-size: 20px;
  text-align: center;
  color: #222;
  background-color: #fff;
}
.term { font-size: 1.6em; font-weight: 600; }
.reading { color: #666; margin-bottom: 0.5em; }
.meaning-ja, .meaning-en { margin: 0.4em 0; }
.example { font-style: italic; color: #444; margin-top: 0.8em; }
.source { font-size: 0.7em; margin-top: 1em; }
.source a { color: #888; }
`;

const RECOGNITION_AFMT = [
  "{{FrontSide}}<hr id=answer>",
  '{{#Reading}}<div class="reading">{{Reading}}</div>{{/Reading}}',
  '{{#MeaningJa}}<div class="meaning-ja">{{MeaningJa}}</div>{{/MeaningJa}}',
  '{{#MeaningEn}}<div class="meaning-en">{{MeaningEn}}</div>{{/MeaningEn}}',
  '{{#Example}}<div class="example">{{Example}}</div>{{/Example}}',
  '{{#Source}}<div class="source">{{Source}}</div>{{/Source}}',
].join("\n");

const RECALL_QFMT = [
  '{{#MeaningJa}}<div class="meaning-ja">{{MeaningJa}}</div>{{/MeaningJa}}',
  '{{#MeaningEn}}<div class="meaning-en">{{MeaningEn}}</div>{{/MeaningEn}}',
].join("\n");

const RECALL_AFMT = [
  "{{FrontSide}}<hr id=answer>",
  '<div class="term">{{Term}}</div>',
  '{{#Reading}}<div class="reading">{{Reading}}</div>{{/Reading}}',
  '{{#Example}}<div class="example">{{Example}}</div>{{/Example}}',
  '{{#Source}}<div class="source">{{Source}}</div>{{/Source}}',
].join("\n");

function buildModel(name: string, modSecs: number) {
  return {
    id: MODEL_ID,
    name,
    type: 0,
    mod: modSecs,
    usn: -1,
    sortf: 0,
    did: DECK_ID,
    tmpls: [
      {
        name: "Recognition",
        ord: 0,
        qfmt: "{{Term}}",
        afmt: RECOGNITION_AFMT,
        bqfmt: "",
        bafmt: "",
        did: null,
      },
      {
        name: "Recall",
        ord: 1,
        qfmt: RECALL_QFMT,
        afmt: RECALL_AFMT,
        bqfmt: "",
        bafmt: "",
        did: null,
      },
    ],
    flds: ENGLISH_VOCAB_FIELDS.map((fieldName, ord) => ({
      name: fieldName,
      ord,
      sticky: false,
      rtl: false,
      font: "Arial",
      size: 20,
      media: [],
    })),
    css: CARD_CSS,
    latexPre: LATEX_PRE,
    latexPost: LATEX_POST,
    latexsvg: false,
    req: [
      [0, "any", [0]],
      [1, "any", [2, 3]],
    ],
    tags: [],
    vers: [],
  };
}

function buildDecks(deckName: string, modSecs: number) {
  const base = {
    mod: modSecs,
    usn: 0,
    lrnToday: [0, 0],
    revToday: [0, 0],
    newToday: [0, 0],
    timeToday: [0, 0],
    collapsed: false,
    browserCollapsed: false,
    desc: "",
    dyn: 0,
    conf: 1,
    extendNew: 0,
    extendRev: 0,
  };
  return {
    1: { ...base, id: 1, name: "Default" },
    [DECK_ID]: { ...base, id: DECK_ID, name: deckName },
  };
}

const DCONF = {
  1: {
    id: 1,
    name: "Default",
    replayq: true,
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    rev: {
      perDay: 200,
      ease4: 1.3,
      fuzz: 0.05,
      minSpace: 1,
      ivlFct: 1,
      maxIvl: 36500,
      bury: true,
      hardFactor: 1.2,
    },
    timer: 0,
    maxTaken: 60,
    usn: 0,
    new: {
      perDay: 20,
      delays: [1, 10],
      separate: true,
      ints: [1, 4, 7],
      initialFactor: 2500,
      bury: true,
      order: 1,
    },
    mod: 0,
    autoplay: true,
  },
};

function buildConf() {
  return {
    nextPos: 1,
    estTimes: true,
    activeDecks: [1],
    sortType: "noteFld",
    timeLim: 0,
    sortBackwards: false,
    addToCur: true,
    curDeck: 1,
    newBury: true,
    newSpread: 0,
    dueCounts: true,
    curModel: String(MODEL_ID),
    collapseTime: 1200,
  };
}

/** Anki's field checksum: first 32 bits of SHA-1 over the HTML-stripped first field. */
export async function fieldChecksum(field: string): Promise<number> {
  const stripped = field.replaceAll(/<[^>]+>/g, "");
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(stripped));
  const view = new DataView(digest);
  return view.getUint32(0, false);
}

/** Unix seconds of 04:00 local time today (Anki's "day rollover"), relative to `now`. */
function collectionCreation(now: Date): number {
  const start = new Date(now);
  start.setHours(4, 0, 0, 0);
  if (start.getTime() > now.getTime()) start.setDate(start.getDate() - 1);
  return Math.floor(start.getTime() / 1000);
}

function insertCollection(db: Database, deckName: string, noteTypeName: string, now: Date): void {
  const nowMs = now.getTime();
  const nowSecs = Math.floor(nowMs / 1000);
  db.run(
    "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (1, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)",
    [
      collectionCreation(now),
      nowMs,
      nowMs,
      ANKI_SCHEMA_VERSION,
      JSON.stringify(buildConf()),
      JSON.stringify({ [MODEL_ID]: buildModel(noteTypeName, nowSecs) }),
      JSON.stringify(buildDecks(deckName, nowSecs)),
      JSON.stringify(DCONF),
      "{}",
    ],
  );
}

/**
 * Builds an Anki `.apkg` (zip of `collection.anki2` + `media`) entirely in memory.
 * Deleted terms are skipped. Note/card ids derive from `now`, so a fixed `now` yields
 * a deterministic archive body.
 */
export async function exportApkg(
  terms: readonly Term[],
  options: ExportApkgOptions,
): Promise<Uint8Array> {
  const now = options.now ?? new Date();
  const noteTypeName = options.noteTypeName ?? DEFAULT_NOTE_TYPE_NAME;
  const SQL = await loadSqlJs(options.runtime ?? {});
  const db = new SQL.Database();
  try {
    db.exec(SCHEMA_SQL);
    insertCollection(db, options.deckName, noteTypeName, now);

    const nowSecs = Math.floor(now.getTime() / 1000);
    let nextId = now.getTime();
    let due = 1;
    const insertNote = db.prepare(
      "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')",
    );
    const insertCard = db.prepare(
      "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')",
    );
    try {
      for (const term of terms) {
        if (term.deletedAt !== undefined) continue;
        const fields = renderFieldValues(term);
        const first = fields[0] ?? "";
        const tags = sanitizeTags(term.tags);
        const noteId = nextId++;
        insertNote.run([
          noteId,
          term.id,
          MODEL_ID,
          nowSecs,
          tags.length === 0 ? "" : ` ${tags.join(" ")} `,
          fields.join("\x1f"),
          first.replaceAll(/<[^>]+>/g, ""),
          await fieldChecksum(first),
        ]);
        for (const ord of [0, 1]) {
          insertCard.run([nextId++, noteId, DECK_ID, ord, nowSecs, due++]);
        }
      }
    } finally {
      insertNote.free();
      insertCard.free();
    }

    const collection = db.export();
    return zipSync({ "collection.anki2": collection, media: strToU8("{}") }, { level: 6 });
  } finally {
    db.close();
  }
}

/** `<deck slug>-YYYYMMDD.apkg`, e.g. `my-deck-20260910.apkg`. Date uses UTC. */
export function apkgFileName(deckName: string, now: Date = new Date()): string {
  const slug =
    deckName
      .trim()
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
      .replaceAll(/^-+|-+$/g, "") || "deck";
  const yyyymmdd = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `${slug}-${yyyymmdd}.apkg`;
}
