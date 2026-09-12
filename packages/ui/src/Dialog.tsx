import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "./Button.tsx";
import { cn } from "./utils/cn.ts";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close is mouse-only; keyboard users close via Escape or the button.
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn("rounded-lg border border-solid-gray-600 p-0 backdrop:bg-black/50", className)}
      aria-labelledby="dialog-title"
    >
      <div className="flex min-w-[280px] flex-col gap-16 p-24">
        <div className="flex items-center justify-between gap-16">
          <h2 id="dialog-title" className="text-std-20B-160">
            {title}
          </h2>
          <Button variant="text" size="xs" onClick={onClose} aria-label="閉じる">
            閉じる
          </Button>
        </div>
        <div>{children}</div>
        {footer ? <div className="flex justify-end gap-8">{footer}</div> : null}
      </div>
    </dialog>
  );
}
