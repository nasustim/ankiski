import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

/**
 * sql.js fetches its wasm at runtime. Importing it with `?url` makes Vite emit the file as a
 * build asset, so the URL is correct under `vite dev`, `vite build` and the `/ankiski/` base.
 */
export const apkgRuntime = {
  locateFile: () => wasmUrl,
};
