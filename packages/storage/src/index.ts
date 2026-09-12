export type { StorageAdapter } from "@ankiski/core";
export type {
  BridgeHandler,
  BridgeHandlerOptions,
  BridgeSender,
  ExtensionBridgeAdapterOptions,
  ExternalRuntimeLike,
  RuntimeLike,
} from "./bridge.ts";
export {
  attachBridgeHandler,
  BridgeError,
  createBridgeHandler,
  DEFAULT_ALLOWED_ORIGINS,
  detectExtension,
  ExtensionBridgeAdapter,
} from "./bridge.ts";
export { ChromeStorageAdapter } from "./chrome-storage.ts";
export { emptyVault } from "./empty.ts";
export type { IndexedDbAdapterOptions } from "./indexeddb.ts";
export { IndexedDbAdapter } from "./indexeddb.ts";
export { MemoryAdapter } from "./memory.ts";
export type {
  SelectStorageMode,
  SelectStorageOptions,
  SelectStorageResult,
} from "./select.ts";
export { selectStorage } from "./select.ts";
export type { ChromeLike, ChromeMock } from "./testing/chrome-mock.ts";
export { createChromeMock } from "./testing/chrome-mock.ts";
export type { ImportVaultJsonResult } from "./vault-json.ts";
export {
  importVaultJson,
  parseVaultJson,
  serializeVault,
  VaultJsonError,
  vaultFileName,
} from "./vault-json.ts";
