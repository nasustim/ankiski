export type ClassValue = string | number | boolean | null | undefined;

/**
 * Joins class name fragments, skipping falsy values.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter((value): value is string | number => Boolean(value)).join(" ");
}
