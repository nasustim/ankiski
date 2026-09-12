/**
 * A fake `chrome` covering the slice of the extension APIs the service worker,
 * popup and options page touch. `@ankiski/storage` ships a storage-only mock;
 * this one adds contextMenus / action / tabs / scripting / runtime / windows and
 * emits `storage.onChanged` so subscriptions fire the way they do in Chrome.
 */

export type StorageChange = { oldValue?: unknown; newValue?: unknown };
export type StorageListener = (changes: Record<string, StorageChange>, areaName: string) => void;

export type StorageAreaMock = {
  store: Record<string, unknown>;
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type ContextMenuCreateProps = {
  id?: string;
  title?: string;
  contexts?: readonly string[];
};

export type ContextMenuInfo = {
  menuItemId: string;
  selectionText?: string;
  pageUrl?: string;
};

export type TabLike = { id?: number; url?: string; active?: boolean; windowId?: number };

export type ScriptInjection = {
  target: { tabId: number };
  func: (...args: never[]) => unknown;
  args?: readonly unknown[];
};

export type InjectionResult = { result?: unknown };

export type ExtensionChromeMock = {
  chrome: ChromeMockApi;
  /** Fires `runtime.onInstalled`. */
  fireInstalled(reason?: string): void;
  /** Fires `contextMenus.onClicked`. */
  clickContextMenu(info: ContextMenuInfo, tab?: TabLike): void;
  /** Fires `storage.onChanged` for the given area. */
  emitChange(changes: Record<string, StorageChange>, areaName?: string): void;
  /** Delivers an `onMessageExternal` message and resolves with the response. */
  sendExternal(message: unknown, sender: { origin?: string; url?: string }): Promise<unknown>;
  /** Everything passed to `contextMenus.create`. */
  createdMenus: ContextMenuCreateProps[];
  /** Everything passed to `scripting.executeScript`. */
  injections: ScriptInjection[];
  /** Everything passed to `windows.create`. */
  createdWindows: Record<string, unknown>[];
  /** Current badge label. */
  badgeText: string;
  badgeColor: string;
  openPopupCalls: number;
};

type ExternalListener = (
  message: unknown,
  sender: { origin?: string; url?: string },
  sendResponse: (response: never) => void,
) => boolean;

export type ChromeMockApi = {
  storage: {
    local: StorageAreaMock;
    session: StorageAreaMock;
    sync: StorageAreaMock;
    onChanged: {
      addListener(listener: StorageListener): void;
      removeListener(listener: StorageListener): void;
    };
  };
  contextMenus: {
    create(props: ContextMenuCreateProps): void;
    removeAll(): Promise<void>;
    onClicked: { addListener(listener: (info: ContextMenuInfo, tab?: TabLike) => void): void };
  };
  action: {
    setBadgeText(details: { text: string }): Promise<void>;
    setBadgeBackgroundColor(details: { color: string }): Promise<void>;
    openPopup(): Promise<void>;
  };
  tabs: { query(info: Record<string, unknown>): Promise<TabLike[]> };
  scripting: { executeScript(injection: ScriptInjection): Promise<InjectionResult[]> };
  runtime: {
    onInstalled: { addListener(listener: (details: { reason: string }) => void): void };
    onMessageExternal: {
      addListener(listener: ExternalListener): void;
      removeListener(listener: ExternalListener): void;
    };
    getURL(path: string): string;
    getManifest(): { version: string };
  };
  windows: { create(props: Record<string, unknown>): Promise<{ id: number }> };
};

export type ExtensionChromeMockOptions = {
  /** Result returned by `scripting.executeScript`. Default: no frames responded. */
  executeScriptResult?: InjectionResult[];
  /** Make `scripting.executeScript` reject, as it does on chrome:// pages. */
  executeScriptError?: Error;
  /** Make `action.openPopup()` reject, as it does without a user gesture. */
  openPopupError?: Error;
  /** Tabs returned by `tabs.query`. */
  tabs?: TabLike[];
  version?: string;
};

export function createExtensionChromeMock(
  options: ExtensionChromeMockOptions = {},
): ExtensionChromeMock {
  const storageListeners = new Set<StorageListener>();
  const createdMenus: ContextMenuCreateProps[] = [];
  const injections: ScriptInjection[] = [];
  const createdWindows: Record<string, unknown>[] = [];
  const installedListeners: ((details: { reason: string }) => void)[] = [];
  const menuListeners: ((info: ContextMenuInfo, tab?: TabLike) => void)[] = [];
  const externalListeners = new Set<ExternalListener>();

  function createArea(areaName: string): StorageAreaMock {
    const store: Record<string, unknown> = {};
    const notify = (changes: Record<string, StorageChange>) => {
      for (const listener of storageListeners) listener(changes, areaName);
    };
    return {
      store,
      async get(key) {
        return key in store ? { [key]: store[key] } : {};
      },
      async set(items) {
        const changes: Record<string, StorageChange> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: store[key], newValue: value };
          store[key] = value;
        }
        notify(changes);
      },
      async remove(key) {
        const oldValue = store[key];
        delete store[key];
        notify({ [key]: { oldValue } });
      },
      async clear() {
        for (const key of Object.keys(store)) delete store[key];
      },
    };
  }

  const mock: ExtensionChromeMock = {
    createdMenus,
    injections,
    createdWindows,
    badgeText: "",
    badgeColor: "",
    openPopupCalls: 0,
    chrome: {
      storage: {
        local: createArea("local"),
        session: createArea("session"),
        sync: createArea("sync"),
        onChanged: {
          addListener(listener) {
            storageListeners.add(listener);
          },
          removeListener(listener) {
            storageListeners.delete(listener);
          },
        },
      },
      contextMenus: {
        create(props) {
          createdMenus.push(props);
        },
        async removeAll() {
          createdMenus.length = 0;
        },
        onClicked: {
          addListener(listener) {
            menuListeners.push(listener);
          },
        },
      },
      action: {
        async setBadgeText(details) {
          mock.badgeText = details.text;
        },
        async setBadgeBackgroundColor(details) {
          mock.badgeColor = details.color;
        },
        async openPopup() {
          mock.openPopupCalls += 1;
          if (options.openPopupError) throw options.openPopupError;
        },
      },
      tabs: {
        async query() {
          return options.tabs ?? [];
        },
      },
      scripting: {
        async executeScript(injection) {
          injections.push(injection);
          if (options.executeScriptError) throw options.executeScriptError;
          return options.executeScriptResult ?? [];
        },
      },
      runtime: {
        onInstalled: {
          addListener(listener) {
            installedListeners.push(listener);
          },
        },
        onMessageExternal: {
          addListener(listener) {
            externalListeners.add(listener);
          },
          removeListener(listener) {
            externalListeners.delete(listener);
          },
        },
        getURL(path) {
          return `chrome-extension://ankiski-test-id/${path.replace(/^\//u, "")}`;
        },
        getManifest() {
          return { version: options.version ?? "0.0.0" };
        },
      },
      windows: {
        async create(props) {
          createdWindows.push(props);
          return { id: createdWindows.length };
        },
      },
    },
    fireInstalled(reason = "install") {
      for (const listener of installedListeners) listener({ reason });
    },
    clickContextMenu(info, tab) {
      for (const listener of menuListeners) listener(info, tab);
    },
    emitChange(changes, areaName = "local") {
      for (const listener of storageListeners) listener(changes, areaName);
    },
    sendExternal(message, sender) {
      return new Promise((resolve) => {
        for (const listener of externalListeners) {
          listener(message, sender, resolve as (response: never) => void);
        }
      });
    },
  };

  return mock;
}
