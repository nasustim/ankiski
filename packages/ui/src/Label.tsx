import type { HTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "./utils/cn.ts";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ htmlFor, className, children, ...rest }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("inline-flex items-center gap-8 text-std-16B-170", className)}
      {...rest}
    >
      {children}
    </label>
  );
}

export type RequirementBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  required?: boolean;
};

export function RequirementBadge({ required = false, className, ...rest }: RequirementBadgeProps) {
  return (
    <span
      className={cn(
        "text-dns-14B-130 rounded-lg px-8 py-2",
        required ? "bg-error-1 text-white" : "bg-solid-gray-420 text-white",
        className,
      )}
      {...rest}
    >
      {required ? "必須" : "任意"}
    </span>
  );
}
