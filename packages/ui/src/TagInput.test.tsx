import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagInput } from "./TagInput.tsx";

describe("TagInput", () => {
  it("renders existing tags", () => {
    render(<TagInput id="tags" value={["TOEIC", "旅行"]} onChange={vi.fn()} suggestions={[]} />);
    expect(screen.getByText("TOEIC")).toBeInTheDocument();
    expect(screen.getByText("旅行")).toBeInTheDocument();
  });

  it("adds a trimmed tag when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput id="tags" value={[]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "  business  {Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["business"]);
  });

  it("adds a tag when comma is typed and replaces internal whitespace with underscore", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput id="tags" value={[]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "word list,");
    expect(onChange).toHaveBeenLastCalledWith(["word_list"]);
  });

  it("ignores empty and duplicate tags", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput id="tags" value={["TOEIC"]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "TOEIC{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    await user.type(input, "   {Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes the last tag with Backspace when input is empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput id="tags" value={["TOEIC", "旅行"]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByRole("textbox");
    input.focus();
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith(["TOEIC"]);
  });

  it("does not remove a tag with Backspace when input has text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput id="tags" value={["TOEIC"]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "a");
    await user.keyboard("{Backspace}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows filtered suggestions excluding already-selected tags, case-insensitively", async () => {
    const user = userEvent.setup();
    render(
      <TagInput
        id="tags"
        value={["toeic"]}
        onChange={vi.fn()}
        suggestions={["TOEIC", "Travel", "Business"]}
      />,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "tra");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Travel" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "TOEIC" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Business" })).not.toBeInTheDocument();
  });

  it("selects a suggestion via click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput id="tags" value={[]} onChange={onChange} suggestions={["Travel", "Business"]} />,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "tra");
    await user.click(screen.getByRole("option", { name: "Travel" }));
    expect(onChange).toHaveBeenCalledWith(["Travel"]);
  });

  it("selects a suggestion via ArrowDown then Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagInput id="tags" value={[]} onChange={onChange} suggestions={["Travel", "Business"]} />,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "b");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith(["Business"]);
  });

  it("hides suggestions on Escape", async () => {
    const user = userEvent.setup();
    render(
      <TagInput id="tags" value={[]} onChange={vi.fn()} suggestions={["Travel", "Business"]} />,
    );
    const input = screen.getByRole("textbox");
    await user.type(input, "tra");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
