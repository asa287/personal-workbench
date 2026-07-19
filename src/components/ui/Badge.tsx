import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "silver" | "danger" | "warning" | "outline";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-neutral-200/60 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  silver: "bg-silver-300/15 text-silver-700 dark:text-silver-300",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  outline: "border border-default text-secondary",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium leading-none",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
