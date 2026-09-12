import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea.tsx";

describe("Textarea", () => {
  it("renders a textarea associated with a label", () => {
    render(
      <>
        <label htmlFor="memo">メモ</label>
        <Textarea id="memo" />
      </>,
    );
    expect(screen.getByLabelText("メモ")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="メモ" />);
    const textarea = screen.getByLabelText("メモ");
    await user.type(textarea, "hello world");
    expect(textarea).toHaveValue("hello world");
  });

  it("applies error styling and aria-invalid when isError is true", () => {
    render(<Textarea aria-label="メモ" isError />);
    const textarea = screen.getByLabelText("メモ");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea.className).toContain("border-error-1");
  });
});
