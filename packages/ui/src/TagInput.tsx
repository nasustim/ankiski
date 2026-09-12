import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { Tag } from "./Tag.tsx";
import { cn } from "./utils/cn.ts";

export type TagInputProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
};

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, "_");
}

export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) {
      return [];
    }
    const selected = new Set(value.map((tag) => tag.toLowerCase()));
    return suggestions.filter(
      (suggestion) =>
        !selected.has(suggestion.toLowerCase()) && suggestion.toLowerCase().includes(query),
    );
  }, [draft, suggestions, value]);

  const showListbox = suggestionsOpen && filteredSuggestions.length > 0;

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) {
      return;
    }
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      setSuggestionsOpen(false);
      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setSuggestionsOpen(false);
    setActiveIndex(-1);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showListbox && event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
      return;
    }
    if (showListbox && event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filteredSuggestions.length - 1 : prev - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (showListbox && activeIndex >= 0) {
        const selected = filteredSuggestions[activeIndex];
        if (selected) {
          addTag(selected);
        }
        return;
      }
      addTag(draft);
      return;
    }
    if (event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className={cn("relative flex flex-col gap-8", className)}>
      <div className="flex flex-wrap items-center gap-8 rounded-lg border border-solid-gray-600 bg-white p-8">
        {value.map((tag, index) => (
          <Tag key={tag} label={tag} onRemove={() => removeTag(index)} />
        ))}
        <input
          id={id}
          type="text"
          aria-autocomplete="list"
          aria-controls={id ? `${id}-listbox` : undefined}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            setSuggestionsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-[120px] flex-1 border-none text-std-16N-170 outline-none"
        />
      </div>
      {showListbox ? (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute top-full z-10 mt-4 w-full rounded-lg border border-solid-gray-600 bg-white shadow-md"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => addTag(suggestion)}
              className={cn(
                "block w-full px-12 py-8 text-left text-std-16N-170 hover:bg-solid-gray-100",
                index === activeIndex && "bg-solid-gray-100",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
