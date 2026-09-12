import type { Ref, SelectHTMLAttributes } from "react";
import { cn } from "./utils/cn.ts";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  isError?: boolean;
  ref?: Ref<HTMLSelectElement>;
};

export function Select({ isError = false, className, ref, children, ...rest }: SelectProps) {
  return (
    <select
      ref={ref}
      aria-invalid={isError}
      className={cn(
        "h-[44px] w-full rounded-lg border bg-white px-12 text-std-16N-170 text-solid-gray-900 outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-solid-gray-100 disabled:text-solid-gray-420",
        isError ? "border-error-1" : "border-solid-gray-600",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
