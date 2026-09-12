import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupportText } from "./SupportText.tsx";

describe("SupportText", () => {
  it("renders supplementary help text", () => {
    render(<SupportText>半角英数字で入力してください</SupportText>);
    expect(screen.getByText("半角英数字で入力してください")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<SupportText className="custom">text</SupportText>);
    expect(screen.getByText("text")).toHaveClass("custom");
  });
});
