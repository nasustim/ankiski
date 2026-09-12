import type { BridgeRequest, BridgeResponse, Vault } from "@ankiski/core";
import { describe, expect, it, vi } from "vitest";
import {
  attachBridgeHandler,
  BridgeError,
  createBridgeHandler,
  DEFAULT_ALLOWED_ORIGINS,
  detectExtension,
  ExtensionBridgeAdapter,
} from "./bridge.ts";
import { emptyVault } from "./empty.ts";
import { MemoryAdapter } from "./memory.ts";

function makeVault(overrides: Partial<Vault> = {}): Vault {
  return {
    ...emptyVault(new Date("2024-01-01T00:00:00.000Z")),
    ...overrides,
  };
}

type FakeRuntime = {
  sendMessage: (extensionId: string, message: BridgeRequest) => Promise<unknown>;
};

describe("ExtensionBridgeAdapter", () => {
  it("has kind 'extension-bridge'", () => {
    const runtime: FakeRuntime = { sendMessage: vi.fn() };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    expect(adapter.kind).toBe("extension-bridge");
  });

  it("isAvailable resolves true on a valid pong", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: true, type: "ankiski/pong", version: "1.0" }),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });

  it("isAvailable resolves false when sendMessage throws", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockRejectedValue(new Error("no receiver")),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it("isAvailable resolves false on malformed response", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: false, error: "boom" }),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it("isAvailable resolves false when the response never arrives (timeout)", async () => {
    vi.useFakeTimers();
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    const promise = adapter.isAvailable();
    await vi.advanceTimersByTimeAsync(1500);
    await expect(promise).resolves.toBe(false);
    vi.useRealTimers();
  });

  it("load returns the vault from a successful response", async () => {
    const vault = makeVault({ tags: ["a"] });
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: true, type: "ankiski/vault", vault }),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.load()).resolves.toEqual(vault);
  });

  it("load throws BridgeError when response is not ok", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: false, error: "load failed" }),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.load()).rejects.toThrow(BridgeError);
    await expect(adapter.load()).rejects.toThrow("load failed");
  });

  it("save sends the vault and resolves on success", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, type: "ankiski/saved" });
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime: { sendMessage } });
    const vault = makeVault();
    await adapter.save(vault);
    expect(sendMessage).toHaveBeenCalledWith("ext-id", { type: "ankiski/save", vault });
  });

  it("save throws BridgeError when response is not ok", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: false, error: "save failed" }),
    };
    const adapter = new ExtensionBridgeAdapter("ext-id", { runtime });
    await expect(adapter.save(makeVault())).rejects.toThrow("save failed");
  });

  it("subscribe polls and notifies only when updatedAt changes", async () => {
    vi.useFakeTimers();
    const v1 = makeVault({ updatedAt: "2024-01-01T00:00:00.000Z" });
    const v2 = makeVault({ updatedAt: "2024-01-02T00:00:00.000Z" });
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, type: "ankiski/vault", vault: v1 })
      .mockResolvedValueOnce({ ok: true, type: "ankiski/vault", vault: v1 })
      .mockResolvedValueOnce({ ok: true, type: "ankiski/vault", vault: v2 });

    const adapter = new ExtensionBridgeAdapter("ext-id", {
      runtime: { sendMessage },
      pollMs: 1000,
    });
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, v1);
    expect(listener).toHaveBeenNthCalledWith(2, v2);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(5000);
    expect(sendMessage).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe("detectExtension", () => {
  it("returns an adapter when isAvailable is true", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockResolvedValue({ ok: true, type: "ankiski/pong", version: "1.0" }),
    };
    const adapter = await detectExtension("ext-id", { runtime });
    expect(adapter).toBeInstanceOf(ExtensionBridgeAdapter);
  });

  it("returns null when isAvailable is false", async () => {
    const runtime: FakeRuntime = {
      sendMessage: vi.fn().mockRejectedValue(new Error("nope")),
    };
    const adapter = await detectExtension("ext-id", { runtime });
    expect(adapter).toBeNull();
  });

  it("returns null when chrome.runtime.sendMessage is unavailable", async () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    // biome-ignore lint/suspicious/noExplicitAny: test-only global assignment
    (globalThis as any).chrome = undefined;
    const adapter = await detectExtension("ext-id");
    expect(adapter).toBeNull();
    // biome-ignore lint/suspicious/noExplicitAny: test-only global cleanup
    (globalThis as any).chrome = originalChrome;
  });
});

describe("createBridgeHandler", () => {
  const opts = { allowedOrigins: DEFAULT_ALLOWED_ORIGINS, version: "1.0.0" };

  it("responds to ping", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler(
      { type: "ankiski/ping" },
      { origin: "https://nasustim.github.io" },
    );
    expect(response).toEqual({ ok: true, type: "ankiski/pong", version: "1.0.0" });
  });

  it("responds to load", async () => {
    const vault = makeVault({ tags: ["a"] });
    const adapter = new MemoryAdapter(vault);
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler(
      { type: "ankiski/load" },
      { origin: "https://nasustim.github.io" },
    );
    expect(response).toEqual({ ok: true, type: "ankiski/vault", vault });
  });

  it("responds to save and persists to the adapter", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const vault = makeVault({ tags: ["saved"] });
    const response = await handler(
      { type: "ankiski/save", vault },
      { origin: "https://nasustim.github.io" },
    );
    expect(response).toEqual({ ok: true, type: "ankiski/saved" });
    await expect(adapter.load()).resolves.toEqual(vault);
  });

  it("rejects requests from disallowed origins", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler(
      { type: "ankiski/ping" },
      { origin: "https://evil.example.com" },
    );
    expect(response).toEqual({ ok: false, error: "origin not allowed" });
  });

  it("allows any localhost port", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler({ type: "ankiski/ping" }, { origin: "http://localhost:9999" });
    expect(response).toEqual({ ok: true, type: "ankiski/pong", version: "1.0.0" });
  });

  it("derives origin from sender.url when sender.origin is absent", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler(
      { type: "ankiski/ping" },
      { url: "https://nasustim.github.io/anki/index.html" },
    );
    expect(response).toEqual({ ok: true, type: "ankiski/pong", version: "1.0.0" });
  });

  it("rejects unknown message types", async () => {
    const adapter = new MemoryAdapter();
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler({ type: "ankiski/unknown" } as unknown as BridgeRequest, {
      origin: "https://nasustim.github.io",
    });
    expect(response).toEqual({ ok: false, error: "unknown message" });
  });

  it("returns an error response when the adapter throws", async () => {
    const adapter = new MemoryAdapter();
    adapter.save = vi.fn().mockRejectedValue(new Error("disk full"));
    const handler = createBridgeHandler(adapter, opts);
    const response = await handler(
      { type: "ankiski/save", vault: makeVault() },
      { origin: "https://nasustim.github.io" },
    );
    expect(response).toEqual({ ok: false, error: "disk full" });
  });
});

describe("attachBridgeHandler", () => {
  it("registers and detaches a listener on onMessageExternal", async () => {
    const listeners: Array<
      (
        message: unknown,
        sender: unknown,
        sendResponse: (response: BridgeResponse) => void,
      ) => boolean
    > = [];
    const runtime = {
      onMessageExternal: {
        addListener: vi.fn((listener) => listeners.push(listener)),
        removeListener: vi.fn((listener) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        }),
      },
    };
    const handler = vi.fn().mockResolvedValue({ ok: true, type: "ankiski/pong", version: "1" });

    const detach = attachBridgeHandler(handler, runtime as never);
    expect(listeners).toHaveLength(1);

    const sendResponse = vi.fn();
    const keepAlive = listeners[0]?.({ type: "ankiski/ping" }, { origin: "x" }, sendResponse);
    expect(keepAlive).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, type: "ankiski/pong", version: "1" });

    detach();
    expect(listeners).toHaveLength(0);
  });
});
