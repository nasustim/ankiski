import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox.tsx";

describe("Checkbox", () => {
  it("renders a checkbox with a visible label", () => {
    render(<Checkbox label="通知を受け取る" />);
    expect(screen.getByRole("checkbox", { name: "通知を受け取る" })).toBeInTheDocument();
  });

  it("toggles checked state on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="通知を受け取る" onChange={onChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "通知を受け取る" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalled();
  });

  it("supports size variants", () => {
    render(<Checkbox label="通知を受け取る" size="sm" />);
    expect(screen.getByRole("checkbox").className).toMatch(/h-/);
  });
});
