import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "./utils/cn.ts";

export type InputBlockSize = "lg" | "md" | "sm";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  isError?: boolean;
  blockSize?: InputBlockSize;
  ref?: Ref<HTMLInputElement>;
};

const blockSizeClasses: Record<InputBlockSize, string> = {
  lg: "h-[52px] px-16 text-std-18N-160",
  md: "h-[44px] px-12 text-std-16N-170",
  sm: "h-[40px] px-8 text-std-16N-170",
};

const baseClasses =
  "w-full rounded-lg border bg-white text-solid-gray-900 outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-solid-gray-100 disabled:text-solid-gray-420";

export function Input({ isError = false, blockSize = "md", className, ref, ...rest }: InputProps) {
  return (
    <input
      ref={ref}
      aria-invalid={isError}
      className={cn(
        baseClasses,
        blockSizeClasses[blockSize],
        isError ? "border-error-1" : "border-solid-gray-600",
        className,
      )}
      {...rest}
    />
  );
}
