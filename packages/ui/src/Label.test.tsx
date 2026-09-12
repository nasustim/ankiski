import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label, RequirementBadge } from "./Label.tsx";

describe("Label", () => {
  it("renders a label associated with a form control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="term">単語</Label>
        <input id="term" />
      </>,
    );
    expect(screen.getByText("単語")).toBeInstanceOf(HTMLLabelElement);
    expect(screen.getByLabelText("単語")).toBeInTheDocument();
  });

  it("renders children including a RequirementBadge", () => {
    render(
      <Label htmlFor="term">
        単語
        <RequirementBadge required />
      </Label>,
    );
    expect(screen.getByText("必須")).toBeInTheDocument();
  });
});

describe("RequirementBadge", () => {
  it("shows 必須 when required", () => {
    render(<RequirementBadge required />);
    expect(screen.getByText("必須")).toBeInTheDocument();
  });

  it("shows 任意 when not required", () => {
    render(<RequirementBadge />);
    expect(screen.getByText("任意")).toBeInTheDocument();
  });
});
