import type { Vault } from "@ankiski/core";
import { filterNotExported, liveTerms } from "@ankiski/core";

/** Digital Agency "blue-900"-ish; readable against the toolbar in both themes. */
const BADGE_BACKGROUND = "#0017c1";

const MAX_DISPLAYED = 99;

/** Minimal slice of `chrome.action` the badge needs, so tests can pass a stub. */
export type BadgeActionLike = {
  setBadgeText(details: { text: string }): Promise<void>;
  setBadgeBackgroundColor(details: { color: string }): Promise<void>;
};

/** Number of live terms that still need exporting. */
export function pendingExportCount(vault: Vault): number {
  return filterNotExported(liveTerms(vault)).length;
}

/** Badge label: empty when there is nothing pending, capped at "99+". */
export function badgeText(vault: Vault): string {
  const count = pendingExportCount(vault);
  if (count === 0) return "";
  return count > MAX_DISPLAYED ? `${MAX_DISPLAYED}+` : String(count);
}

/**
 * Pushes the current pending count onto the toolbar icon. Failures are swallowed:
 * the badge is cosmetic and `chrome.action` can reject while the browser is shutting down.
 */
export async function updateBadge(vault: Vault, action: BadgeActionLike): Promise<void> {
  try {
    await action.setBadgeText({ text: badgeText(vault) });
    await action.setBadgeBackgroundColor({ color: BADGE_BACKGROUND });
  } catch {
    // ignore: the badge is best-effort
  }
}
