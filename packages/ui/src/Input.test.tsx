import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input.tsx";

describe("Input", () => {
  it("renders a text input associated with a label", () => {
    render(
      <>
        <label htmlFor="term">単語</label>
        <Input id="term" />
      </>,
    );
    expect(screen.getByLabelText("単語")).toBeInTheDocument();
  });

  it("accepts typed input and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label="単語" onChange={onChange} />);
    const input = screen.getByLabelText("単語");
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("applies error styling and aria-invalid when isError is true", () => {
    render(<Input aria-label="単語" isError />);
    const input = screen.getByLabelText("単語");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-error-1");
  });

  it("supports blockSize variants", () => {
    render(<Input aria-label="単語" blockSize="sm" />);
    expect(screen.getByLabelText("単語").className).toMatch(/h-/);
  });
});
