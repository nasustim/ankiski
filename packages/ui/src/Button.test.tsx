import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";

describe("Button", () => {
  it("renders children as a button with type=button by default", () => {
    render(<Button>送信</Button>);
    const button = screen.getByRole("button", { name: "送信" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("respects an explicit type", () => {
    render(<Button type="submit">送信</Button>);
    expect(screen.getByRole("button", { name: "送信" })).toHaveAttribute("type", "submit");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>クリック</Button>);
    await user.click(screen.getByRole("button", { name: "クリック" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies solid variant classes by default", () => {
    render(<Button>solid</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-blue-900");
  });

  it("applies outline variant classes", () => {
    render(<Button variant="outline">outline</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border");
    expect(button.className).not.toContain("bg-blue-900 ");
  });

  it("applies text variant classes", () => {
    render(<Button variant="text">text</Button>);
    const button = screen.getByRole("button");
    expect(button.className).not.toContain("border-solid-gray-600");
  });

  it("supports size variants", () => {
    render(<Button size="sm">small</Button>);
    expect(screen.getByRole("button").className).toMatch(/h-/);
  });

  it("is disabled and marked aria-disabled when disabled", () => {
    render(<Button disabled>disabled</Button>);
    const button = screen.getByRole("button", { name: "disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("merges a custom className", () => {
    render(<Button className="custom-class">custom</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("forwards a ref to the underlying button element", () => {
    let ref: HTMLButtonElement | null = null;
    render(
      <Button
        ref={(el) => {
          ref = el;
        }}
      >
        ref
      </Button>,
    );
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });
});
