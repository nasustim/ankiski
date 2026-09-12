import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tag } from "./Tag.tsx";

describe("Tag", () => {
  it("renders the label", () => {
    render(<Tag label="TOEIC" />);
    expect(screen.getByText("TOEIC")).toBeInTheDocument();
  });

  it("does not render a remove button when onRemove is omitted", () => {
    render(<Tag label="TOEIC" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a labeled remove button and calls onRemove when clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Tag label="TOEIC" onRemove={onRemove} />);
    const button = screen.getByRole("button", { name: "TOEIC を削除" });
    await user.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
