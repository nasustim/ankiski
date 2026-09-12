import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "./Select.tsx";

describe("Select", () => {
  it("renders a native select with options", () => {
    render(
      <Select aria-label="並び順">
        <option value="asc">昇順</option>
        <option value="desc">降順</option>
      </Select>,
    );
    const select = screen.getByLabelText("並び順") as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
  });

  it("supports selecting an option", async () => {
    const user = userEvent.setup();
    render(
      <Select aria-label="並び順">
        <option value="asc">昇順</option>
        <option value="desc">降順</option>
      </Select>,
    );
    const select = screen.getByLabelText("並び順") as HTMLSelectElement;
    await user.selectOptions(select, "desc");
    expect(select.value).toBe("desc");
  });

  it("applies error styling when isError is true", () => {
    render(
      <Select aria-label="並び順" isError>
        <option value="asc">昇順</option>
      </Select>,
    );
    const select = screen.getByLabelText("並び順");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select.className).toContain("border-error-1");
  });
});
