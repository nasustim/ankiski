import { cn } from "./utils/cn.ts";

export type TagProps = {
  label: string;
  onRemove?: () => void;
  className?: string;
};

export function Tag({ label, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-4 rounded-full border border-blue-900 bg-white px-12 py-4 text-std-16N-170 text-blue-900",
        className,
      )}
    >
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} を削除`}
          className="text-blue-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
