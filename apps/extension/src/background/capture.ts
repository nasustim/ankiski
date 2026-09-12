import { type Draft, saveDraft } from "../shared/draft.ts";
import type { StorageLike } from "../shared/storage-area.ts";
import { extractSentence } from "./sentence.ts";

export const CONTEXT_MENU_ID = "ankiski-add-selection";
export const CONTEXT_MENU_TITLE = "Add to ankiski";

/** Path of the popup document, as emitted by CRXJS. */
export const POPUP_PATH = "src/popup/index.html";

const FALLBACK_POPUP_SIZE = { width: 420, height: 640 };

export type SelectionContext = { selection: string; context: string };

export type ContextMenuClickInfo = {
  menuItemId: string | number;
  selectionText?: string;
  pageUrl?: string;
};

export type TabLike = { id?: number; url?: string };

export type ContextMenusLike = {
  create(props: { id: string; title: string; contexts: string[] }): void;
};

export type ScriptingLike = {
  executeScript(injection: {
    target: { tabId: number };
    func: () => SelectionContext | null;
  }): Promise<{ result?: unknown }[]>;
};

export type ActionLike = { openPopup(): Promise<void> };
export type WindowsLike = { create(props: Record<string, unknown>): Promise<unknown> };
export type RuntimeUrlLike = { getURL(path: string): string };

export type CaptureDeps = {
  scripting: ScriptingLike;
  storage: StorageLike;
  action: ActionLike;
  windows: WindowsLike;
  runtime: RuntimeUrlLike;
  now?: () => Date;
};

/** Registers the right-click entry shown on selected text. */
export function registerContextMenu(menus: ContextMenusLike): void {
  menus.create({
    id: CONTEXT_MENU_ID,
    title: CONTEXT_MENU_TITLE,
    contexts: ["selection"],
  });
}

/**
 * Runs inside the page via `chrome.scripting.executeScript`, so it must be
 * self-contained: Chrome serialises the function body and it cannot close over
 * anything from this module.
 */
export function collectSelectionContext(): SelectionContext | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const text = selection.toString();
  if (text.trim() === "") return null;

  const blocks = new Set([
    "P",
    "LI",
    "TD",
    "TH",
    "DD",
    "DT",
    "BLOCKQUOTE",
    "FIGCAPTION",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "ARTICLE",
    "SECTION",
    "MAIN",
    "DIV",
    "BODY",
  ]);

  const container = selection.getRangeAt(0).commonAncestorContainer;
  let element: Element | null =
    container.nodeType === Node.ELEMENT_NODE
      ? (container as Element)
      : (container.parentElement ?? null);
  while (element && !blocks.has(element.tagName)) element = element.parentElement;

  return { selection: text, context: element?.textContent ?? text };
}

function isSelectionContext(value: unknown): value is SelectionContext {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.selection === "string" && typeof candidate.context === "string";
}

/** Asks the page for the selection and the text block around it. Null if unavailable. */
async function readSelectionContext(
  scripting: ScriptingLike,
  tabId: number,
): Promise<SelectionContext | null> {
  try {
    const results = await scripting.executeScript({
      target: { tabId },
      func: collectSelectionContext,
    });
    const first = results[0]?.result;
    return isSelectionContext(first) ? first : null;
  } catch {
    // The tab may be a chrome:// page, the Web Store, or already gone.
    return null;
  }
}

/**
 * Opens the popup. `chrome.action.openPopup()` is only allowed in some contexts,
 * so fall back to a small popup window carrying the same document.
 */
export async function openPopupSafely(
  deps: Pick<CaptureDeps, "action" | "windows" | "runtime">,
): Promise<void> {
  try {
    await deps.action.openPopup();
    return;
  } catch {
    // fall through to the window fallback
  }
  try {
    await deps.windows.create({
      url: deps.runtime.getURL(POPUP_PATH),
      type: "popup",
      ...FALLBACK_POPUP_SIZE,
    });
  } catch {
    // Nothing else we can do; the user can still click the toolbar icon.
  }
}

/**
 * Turns a context-menu click into a stored draft and opens the popup on it.
 * Returns the draft, or null when the click is not ours / has no usable selection.
 */
export async function handleContextMenuClick(
  info: ContextMenuClickInfo,
  tab: TabLike | undefined,
  deps: CaptureDeps,
): Promise<Draft | null> {
  if (info.menuItemId !== CONTEXT_MENU_ID) return null;

  const selectionText = (info.selectionText ?? "").trim();
  if (selectionText === "") return null;

  const captured =
    tab?.id === undefined ? null : await readSelectionContext(deps.scripting, tab.id);
  const example = captured
    ? extractSentence(captured.context, captured.selection)
    : extractSentence(selectionText, selectionText);

  const draft: Draft = {
    term: selectionText,
    example: example === "" ? selectionText : example,
    sourceUrl: tab?.url ?? info.pageUrl ?? "",
    createdAt: (deps.now?.() ?? new Date()).toISOString(),
  };

  await saveDraft(draft, deps.storage);
  await openPopupSafely(deps);
  return draft;
}
