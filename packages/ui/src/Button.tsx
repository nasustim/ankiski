import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "./utils/cn.ts";

export type ButtonVariant = "solid" | "outline" | "text";
export type ButtonSize = "lg" | "md" | "sm" | "xs";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
};

const baseClasses =
  "inline-flex items-center justify-center gap-8 rounded-lg font-bold transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-blue-900 text-white border border-blue-900 hover:bg-light-blue-900",
  outline: "bg-white text-blue-900 border border-blue-900 hover:bg-blue-900/10",
  text: "bg-transparent text-blue-900 border border-transparent underline hover:bg-blue-900/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: "h-[52px] min-w-[44px] px-24 text-std-18B-160",
  md: "h-[44px] min-w-[44px] px-20 text-std-16B-170",
  sm: "h-[40px] min-w-[40px] px-16 text-std-16B-170",
  xs: "h-[32px] min-w-[32px] px-12 text-std-16B-170",
};

export function Button({
  variant = "solid",
  size = "md",
  type = "button",
  disabled = false,
  className,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...rest}
    />
  );
}
