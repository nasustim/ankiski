import type { InputHTMLAttributes, Ref } from "react";
import { useId } from "react";
import { cn } from "./utils/cn.ts";

export type CheckboxSize = "lg" | "md" | "sm";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  label: string;
  size?: CheckboxSize;
  ref?: Ref<HTMLInputElement>;
};

const sizeClasses: Record<CheckboxSize, string> = {
  lg: "h-24 w-24",
  md: "h-20 w-20",
  sm: "h-16 w-16",
};

export function Checkbox({ label, size = "md", className, id, ref, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <span className="inline-flex items-center gap-8">
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className={cn(
          "rounded-4 border border-solid-gray-600 text-blue-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2",
          sizeClasses[size],
          className,
        )}
        {...rest}
      />
      <label htmlFor={checkboxId} className="text-std-16N-170">
        {label}
      </label>
    </span>
  );
}
