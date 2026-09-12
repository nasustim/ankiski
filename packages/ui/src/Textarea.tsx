import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "./utils/cn.ts";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  isError?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ isError = false, className, ref, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={isError}
      className={cn(
        "w-full rounded-lg border bg-white p-12 text-std-16N-170 text-solid-gray-900 outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-solid-gray-100 disabled:text-solid-gray-420",
        isError ? "border-error-1" : "border-solid-gray-600",
        className,
      )}
      {...rest}
    />
  );
}
