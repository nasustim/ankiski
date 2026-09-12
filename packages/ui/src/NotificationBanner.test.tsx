import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationBanner } from "./NotificationBanner.tsx";

describe("NotificationBanner", () => {
  it("uses role=status for info", () => {
    render(
      <NotificationBanner type="info" title="お知らせ">
        本文
      </NotificationBanner>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("お知らせ");
  });

  it("uses role=status for success", () => {
    render(
      <NotificationBanner type="success" title="完了">
        本文
      </NotificationBanner>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("完了");
  });

  it("uses role=alert for warning", () => {
    render(
      <NotificationBanner type="warning" title="注意">
        本文
      </NotificationBanner>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("注意");
  });

  it("uses role=alert for error", () => {
    render(
      <NotificationBanner type="error" title="エラー">
        本文
      </NotificationBanner>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("エラー");
  });

  it("renders a close button when onClose is provided", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NotificationBanner type="info" title="お知らせ" onClose={onClose}>
        本文
      </NotificationBanner>,
    );
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render a close button when onClose is omitted", () => {
    render(
      <NotificationBanner type="info" title="お知らせ">
        本文
      </NotificationBanner>,
    );
    expect(screen.queryByRole("button", { name: "閉じる" })).not.toBeInTheDocument();
  });
});
