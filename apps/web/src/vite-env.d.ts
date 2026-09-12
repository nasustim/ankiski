/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chrome extension id used for the extension-bridge storage adapter. Optional. */
  readonly VITE_EXTENSION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
