import type { HTMLAttributes } from "react";
import { cn } from "./utils/cn.ts";

export type ErrorTextProps = HTMLAttributes<HTMLParagraphElement>;

export function ErrorText({ className, ...rest }: ErrorTextProps) {
  return <p className={cn("text-std-16B-170 text-error-1", className)} {...rest} />;
}
