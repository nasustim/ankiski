import type { HTMLAttributes } from "react";
import { cn } from "./utils/cn.ts";

export type SupportTextProps = HTMLAttributes<HTMLParagraphElement>;

export function SupportText({ className, ...rest }: SupportTextProps) {
  return <p className={cn("text-std-16N-170 text-solid-gray-600", className)} {...rest} />;
}
