import { cn } from "@/lib/cn";

export function Tag({
  children,
  className,
  onRemove,
}: {
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium",
        "bg-neutral-100 dark:bg-neutral-800 text-secondary border border-default",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-danger transition-colors"
          aria-label="移除标签"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function TagInput({
  tags,
  onChange,
  placeholder = "输入后回车添加",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = (e.currentTarget.value || "").trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      e.currentTarget.value = "";
    } else if (e.key === "Backspace" && !e.currentTarget.value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] px-2 py-1.5 bg-elevated border border-default rounded-md focus-within:border-strong focus-within:ring-1 focus-within:ring-neutral-400 transition-colors">
      {tags.map((t) => (
        <Tag key={t} onRemove={() => onChange(tags.filter((x) => x !== t))}>
          {t}
        </Tag>
      ))}
      <input
        type="text"
        onKeyDown={handleKeyDown}
        placeholder={tags.length ? "" : placeholder}
        className="flex-1 min-w-[80px] bg-transparent border-0 outline-none text-sm text-primary placeholder:text-muted"
      />
    </div>
  );
}
