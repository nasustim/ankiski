import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TermForm } from "./TermForm.tsx";

describe("TermForm", () => {
  it("renders all fields with Japanese labels", () => {
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/単語/)).toBeInTheDocument();
    expect(screen.getByLabelText(/読み/)).toBeInTheDocument();
    expect(screen.getByLabelText(/意味（日本語）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/意味（英語）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/例文/)).toBeInTheDocument();
    expect(screen.getByLabelText(/出典/)).toBeInTheDocument();
    expect(screen.getByLabelText(/タグ/)).toBeInTheDocument();
  });

  it("shows a default submit label of 保存", () => {
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("supports a custom submit label", () => {
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} submitLabel="追加" />);
    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
  });

  it("disables the submit button while busy", () => {
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} busy />);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("prefills fields from initialValues", () => {
    render(
      <TermForm
        tagSuggestions={[]}
        onSubmit={vi.fn()}
        initialValues={{ term: "apple", reading: "アップル", meaningJa: "りんご" }}
      />,
    );
    expect(screen.getByLabelText(/単語/)).toHaveValue("apple");
    expect(screen.getByLabelText(/読み/)).toHaveValue("アップル");
    expect(screen.getByLabelText(/意味（日本語）/)).toHaveValue("りんご");
  });

  it("shows a validation error when term is empty on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TermForm tagSuggestions={[]} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("単語を入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a validation error when neither meaning is filled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TermForm tagSuggestions={[]} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/単語/), "apple");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getAllByText("日本語または英語の意味を入力してください").length).toBeGreaterThan(
      0,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a validation error for an invalid source URL", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TermForm tagSuggestions={[]} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/単語/), "apple");
    await user.type(screen.getByLabelText(/意味（日本語）/), "りんご");
    await user.type(screen.getByLabelText(/出典/), "not-a-url");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the trimmed values on a valid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TermForm tagSuggestions={[]} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/単語/), "  apple  ");
    await user.type(screen.getByLabelText(/意味（日本語）/), "りんご");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ term: "apple", meaningJa: "りんご" }),
    );
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not render a cancel button when onCancel is omitted", () => {
    render(<TermForm tagSuggestions={[]} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "キャンセル" })).not.toBeInTheDocument();
  });
});
