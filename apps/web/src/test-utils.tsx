import type { Term, TermInput, Vault } from "@ankiski/core";
import { createTerm } from "@ankiski/core";
import { MemoryAdapter } from "@ankiski/storage";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { useVaultStore } from "./store/vault-store.ts";

export function renderWithRouter(ui: ReactElement, initialPath = "/"): RenderResult {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

export function makeTerm(input: TermInput, overrides: Partial<Term> = {}): Term {
  return { ...createTerm(input), ...overrides };
}

/** Points the app-wide store at a fresh MemoryAdapter seeded with `terms`. */
export async function seedVault(terms: Term[] = []): Promise<MemoryAdapter> {
  const vault: Vault = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    terms,
    tags: [],
  };
  const adapter = new MemoryAdapter(vault);
  await useVaultStore.getState().init({ adapter, mode: "memory" });
  return adapter;
}
