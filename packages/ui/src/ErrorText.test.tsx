import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorText } from "./ErrorText.tsx";

describe("ErrorText", () => {
  it("renders an error message with an id for aria-describedby linking", () => {
    render(<ErrorText id="term-error">単語を入力してください</ErrorText>);
    const text = screen.getByText("単語を入力してください");
    expect(text).toHaveAttribute("id", "term-error");
  });

  it("applies error styling", () => {
    render(<ErrorText>error</ErrorText>);
    expect(screen.getByText("error")).toHaveClass("text-error-1");
  });
});
