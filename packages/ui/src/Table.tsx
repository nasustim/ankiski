import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "./utils/cn.ts";

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

export function Table({ className, ...rest }: TableProps) {
  return (
    <table
      className={cn("w-full border-collapse border border-solid-gray-420", className)}
      {...rest}
    />
  );
}

export type TheadProps = HTMLAttributes<HTMLTableSectionElement>;

export function Thead({ className, ...rest }: TheadProps) {
  return <thead className={cn("bg-solid-gray-100", className)} {...rest} />;
}

export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>;

export function Tbody({ className, ...rest }: TbodyProps) {
  return <tbody className={className} {...rest} />;
}

export type TrProps = HTMLAttributes<HTMLTableRowElement>;

export function Tr({ className, ...rest }: TrProps) {
  return <tr className={cn("border-b border-solid-gray-420", className)} {...rest} />;
}

export type ThProps = ThHTMLAttributes<HTMLTableCellElement>;

export function Th({ scope = "col", className, ...rest }: ThProps) {
  return (
    <th
      scope={scope}
      className={cn(
        "border border-solid-gray-420 px-12 py-8 text-left text-std-16B-170",
        className,
      )}
      {...rest}
    />
  );
}

export type TdProps = TdHTMLAttributes<HTMLTableCellElement>;

export function Td({ className, ...rest }: TdProps) {
  return (
    <td
      className={cn("border border-solid-gray-420 px-12 py-8 text-std-16N-170", className)}
      {...rest}
    />
  );
}
