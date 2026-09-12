import type { BridgeRequest, BridgeResponse, StorageAdapter, Vault } from "@ankiski/core";

/** Origins allowed to talk to the extension bridge by default. */
export const DEFAULT_ALLOWED_ORIGINS: string[] = ["https://nasustim.github.io", "http://localhost"];

const PING_TIMEOUT_MS = 1500;
const DEFAULT_POLL_MS = 5000;

/** Thrown when a bridge request fails. */
export class BridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeError";
  }
}

/** Minimal shape of `chrome.runtime` this adapter depends on. */
export type RuntimeLike = {
  sendMessage(extensionId: string, message: BridgeRequest): Promise<unknown>;
};

export type ExtensionBridgeAdapterOptions = {
  runtime?: RuntimeLike;
  pollMs?: number;
};

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), ms);
  });
}

function isPong(
  response: unknown,
): response is { ok: true; type: "ankiski/pong"; version: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    (response as { ok?: unknown }).ok === true &&
    (response as { type?: unknown }).type === "ankiski/pong"
  );
}

function isVaultResponse(
  response: unknown,
): response is { ok: true; type: "ankiski/vault"; vault: Vault } {
  return (
    typeof response === "object" &&
    response !== null &&
    (response as { ok?: unknown }).ok === true &&
    (response as { type?: unknown }).type === "ankiski/vault"
  );
}

function isSavedResponse(response: unknown): response is { ok: true; type: "ankiski/saved" } {
  return (
    typeof response === "object" &&
    response !== null &&
    (response as { ok?: unknown }).ok === true &&
    (response as { type?: unknown }).type === "ankiski/saved"
  );
}

function errorMessage(response: unknown): string {
  if (
    typeof response === "object" &&
    response !== null &&
    (response as { ok?: unknown }).ok === false &&
    typeof (response as { error?: unknown }).error === "string"
  ) {
    return (response as { error: string }).error;
  }
  return "malformed response";
}

/** Storage adapter that talks to the browser extension via chrome.runtime.sendMessage. */
export class ExtensionBridgeAdapter implements StorageAdapter {
  readonly kind = "extension-bridge" as const;

  #extensionId: string;
  #runtime: RuntimeLike;
  #pollMs: number;

  constructor(extensionId: string, opts: ExtensionBridgeAdapterOptions = {}) {
    this.#extensionId = extensionId;
    this.#runtime =
      opts.runtime ??
      ((globalThis as { chrome?: { runtime: RuntimeLike } }).chrome?.runtime as RuntimeLike);
    this.#pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  }

  #send(message: BridgeRequest): Promise<unknown> {
    return this.#runtime.sendMessage(this.#extensionId, message);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await Promise.race([
        this.#send({ type: "ankiski/ping" }),
        timeout(PING_TIMEOUT_MS),
      ]);
      return isPong(response);
    } catch {
      return false;
    }
  }

  async load(): Promise<Vault> {
    const response = await this.#send({ type: "ankiski/load" });
    if (!isVaultResponse(response)) {
      throw new BridgeError(errorMessage(response));
    }
    return response.vault;
  }

  async save(vault: Vault): Promise<void> {
    const response = await this.#send({ type: "ankiski/save", vault });
    if (!isSavedResponse(response)) {
      throw new BridgeError(errorMessage(response));
    }
  }

  subscribe(listener: (vault: Vault) => void): () => void {
    let lastUpdatedAt: string | undefined;
    const interval = setInterval(() => {
      this.load()
        .then((vault) => {
          if (vault.updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = vault.updatedAt;
            listener(vault);
          }
        })
        .catch(() => {});
    }, this.#pollMs);
    return () => {
      clearInterval(interval);
    };
  }
}

/** Detects whether an extension bridge is reachable, returning an adapter if so. */
export async function detectExtension(
  extensionId: string,
  opts: ExtensionBridgeAdapterOptions = {},
): Promise<ExtensionBridgeAdapter | null> {
  const runtime =
    opts.runtime ?? (globalThis as { chrome?: { runtime?: RuntimeLike } }).chrome?.runtime;
  if (!runtime?.sendMessage) {
    return null;
  }
  const adapter = new ExtensionBridgeAdapter(extensionId, { ...opts, runtime });
  const available = await adapter.isAvailable();
  return available ? adapter : null;
}

export type BridgeHandlerOptions = {
  allowedOrigins: string[];
  version: string;
};

export type BridgeSender = {
  origin?: string;
  url?: string;
};

export type BridgeHandler = (message: unknown, sender: BridgeSender) => Promise<BridgeResponse>;

function originOf(sender: BridgeSender): string | undefined {
  if (sender.origin) {
    return sender.origin;
  }
  if (sender.url) {
    try {
      return new URL(sender.url).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }
  for (const allowed of allowedOrigins) {
    if (allowed === origin) {
      return true;
    }
    if (allowed === "http://localhost") {
      try {
        const url = new URL(origin);
        if (
          url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname === "127.0.0.1")
        ) {
          return true;
        }
      } catch {
        // ignore
      }
    }
  }
  return false;
}

function isValidVaultShape(value: unknown): value is Vault {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { schemaVersion?: unknown }).schemaVersion === 1 &&
    Array.isArray((value as { terms?: unknown }).terms)
  );
}

function isBridgeRequest(message: unknown): message is BridgeRequest {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const type = (message as { type?: unknown }).type;
  if (type === "ankiski/ping" || type === "ankiski/load") {
    return true;
  }
  if (type === "ankiski/save") {
    return isValidVaultShape((message as { vault?: unknown }).vault);
  }
  return false;
}

/** Creates the request handler used by the extension side of the bridge. */
export function createBridgeHandler(
  adapter: StorageAdapter,
  opts: BridgeHandlerOptions,
): BridgeHandler {
  return async (message: unknown, sender: BridgeSender): Promise<BridgeResponse> => {
    if (!isOriginAllowed(originOf(sender), opts.allowedOrigins)) {
      return { ok: false, error: "origin not allowed" };
    }
    if (!isBridgeRequest(message)) {
      return { ok: false, error: "unknown message" };
    }
    try {
      switch (message.type) {
        case "ankiski/ping":
          return { ok: true, type: "ankiski/pong", version: opts.version };
        case "ankiski/load": {
          const vault = await adapter.load();
          return { ok: true, type: "ankiski/vault", vault };
        }
        case "ankiski/save": {
          await adapter.save(message.vault);
          return { ok: true, type: "ankiski/saved" };
        }
        default:
          return { ok: false, error: "unknown message" };
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  };
}

export type ExternalRuntimeLike = {
  onMessageExternal: {
    addListener(
      listener: (
        message: unknown,
        sender: BridgeSender,
        sendResponse: (response: BridgeResponse) => void,
      ) => boolean,
    ): void;
    removeListener(
      listener: (
        message: unknown,
        sender: BridgeSender,
        sendResponse: (response: BridgeResponse) => void,
      ) => boolean,
    ): void;
  };
};

/** Wires a bridge handler up to chrome.runtime.onMessageExternal. Returns a detach fn. */
export function attachBridgeHandler(
  handler: BridgeHandler,
  runtime: ExternalRuntimeLike = (globalThis as { chrome: { runtime: ExternalRuntimeLike } }).chrome
    .runtime,
): () => void {
  const listener = (
    message: unknown,
    sender: BridgeSender,
    sendResponse: (response: BridgeResponse) => void,
  ): boolean => {
    handler(message, sender).then(sendResponse);
    return true;
  };
  runtime.onMessageExternal.addListener(listener);
  return () => {
    runtime.onMessageExternal.removeListener(listener);
  };
}
