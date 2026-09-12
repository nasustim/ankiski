import type { ReactNode } from "react";
import { cn } from "./utils/cn.ts";

export type NotificationBannerType = "info" | "success" | "warning" | "error";

export type NotificationBannerProps = {
  type: NotificationBannerType;
  title: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
};

const typeClasses: Record<NotificationBannerType, string> = {
  info: "border-blue-900 bg-blue-900/5 text-blue-900",
  success: "border-success-1 bg-success-1/5 text-success-1",
  warning: "border-warning-yellow-1 bg-warning-yellow-1/5 text-warning-yellow-2",
  error: "border-error-1 bg-error-1/5 text-error-1",
};

const roleByType: Record<NotificationBannerType, "status" | "alert"> = {
  info: "status",
  success: "status",
  warning: "alert",
  error: "alert",
};

export function NotificationBanner({
  type,
  title,
  children,
  onClose,
  className,
}: NotificationBannerProps) {
  return (
    <div
      role={roleByType[type]}
      className={cn(
        "flex items-start justify-between gap-16 rounded-lg border p-16",
        typeClasses[type],
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <p className="text-std-16B-170">{title}</p>
        {children ? <div className="text-std-16N-170">{children}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="shrink-0 text-std-16B-170 underline"
        >
          閉じる
        </button>
      ) : null}
    </div>
  );
}
