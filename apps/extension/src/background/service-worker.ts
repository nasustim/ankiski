import type { StorageAdapter } from "@ankiski/core";
import type { ExternalRuntimeLike } from "@ankiski/storage";
import {
  attachBridgeHandler,
  ChromeStorageAdapter,
  createBridgeHandler,
  DEFAULT_ALLOWED_ORIGINS,
} from "@ankiski/storage";
import type { StorageLike } from "../shared/storage-area.ts";
import type { BadgeActionLike } from "./badge.ts";
import { updateBadge } from "./badge.ts";
import type {
  ActionLike,
  ContextMenuClickInfo,
  ContextMenusLike,
  RuntimeUrlLike,
  ScriptingLike,
  TabLike,
  WindowsLike,
} from "./capture.ts";
import { handleContextMenuClick, registerContextMenu } from "./capture.ts";

/**
 * The `chrome.storage.local` key `ChromeStorageAdapter` writes. Mirrored here so the
 * worker can tell a vault change apart from a draft or settings write.
 */
export const VAULT_STORAGE_KEY = "ankiski.vault";

/** The slice of the extension APIs the service worker needs. */
export type ServiceWorkerApi = {
  runtime: RuntimeUrlLike &
    ExternalRuntimeLike & {
      onInstalled: { addListener(listener: (details: { reason: string }) => void): void };
      getManifest(): { version: string };
    };
  contextMenus: ContextMenusLike & {
    onClicked: {
      addListener(listener: (info: ContextMenuClickInfo, tab?: TabLike) => void): void;
    };
  };
  action: ActionLike & BadgeActionLike;
  scripting: ScriptingLike;
  storage: StorageLike & {
    onChanged: {
      addListener(listener: (changes: Record<string, unknown>, areaName: string) => void): void;
      removeListener(listener: (changes: Record<string, unknown>, areaName: string) => void): void;
    };
  };
  windows: WindowsLike;
};

/**
 * Wires every service-worker listener up. Returns a detach function; production
 * never calls it, but it keeps tests from leaking listeners between cases.
 */
export function startServiceWorker(
  api: ServiceWorkerApi,
  adapter: StorageAdapter = new ChromeStorageAdapter(),
): () => void {
  async function refreshBadge(): Promise<void> {
    try {
      await updateBadge(await adapter.load(), api.action);
    } catch {
      // A corrupt or unreadable vault must not take the worker down.
    }
  }

  const detachBridge = attachBridgeHandler(
    createBridgeHandler(adapter, {
      allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
      version: api.runtime.getManifest().version,
    }),
    api.runtime,
  );

  api.runtime.onInstalled.addListener(() => {
    registerContextMenu(api.contextMenus);
    void refreshBadge();
  });

  api.contextMenus.onClicked.addListener((info, tab) => {
    void handleContextMenuClick(info, tab, {
      scripting: api.scripting,
      storage: api.storage,
      action: api.action,
      windows: api.windows,
      runtime: api.runtime,
    });
  });

  const onStorageChanged = (changes: Record<string, unknown>, areaName: string) => {
    if (areaName !== "local") return;
    if (!(VAULT_STORAGE_KEY in changes)) return;
    void refreshBadge();
  };
  api.storage.onChanged.addListener(onStorageChanged);

  void refreshBadge();

  return () => {
    detachBridge();
    api.storage.onChanged.removeListener(onStorageChanged);
  };
}
