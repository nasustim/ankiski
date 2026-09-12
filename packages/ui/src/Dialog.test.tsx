import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog.tsx";

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
});

describe("Dialog", () => {
  it("renders nothing visible when closed", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="確認">
        本文
      </Dialog>,
    );
    expect(screen.queryByText("本文")).not.toBeVisible();
  });

  it("shows title and children when open", () => {
    render(
      <Dialog open onClose={vi.fn()} title="確認">
        本文
      </Dialog>,
    );
    expect(screen.getByText("確認")).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("renders a footer slot", () => {
    render(
      <Dialog open onClose={vi.fn()} title="確認" footer={<button type="button">OK</button>}>
        本文
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="確認">
        本文
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape (native cancel event) is triggered", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="確認">
        本文
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { hidden: true });
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
