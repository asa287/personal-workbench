import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "neutral",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "neutral" | "silver" | "danger" | "warning" | "blue";
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass = {
    neutral: "bg-neutral-600 dark:bg-neutral-300",
    silver: "bg-silver-500",
    danger: "bg-danger",
    warning: "bg-warning",
    blue: "bg-brand",
  }[tone];
  return (
    <div
      className={cn(
        "h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", toneClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 36,
  stroke = 3,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <svg width={size} height={size} className={className}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-neutral-200 dark:stroke-neutral-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke="currentColor"
        className="text-silver-500"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 500ms ease-out" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-current text-secondary"
        style={{ fontSize: size / 4, fontWeight: 600 }}
      >
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
}
