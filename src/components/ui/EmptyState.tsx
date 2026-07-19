import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 w-12 h-12 rounded-full bg-elevated border border-default flex items-center justify-center text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-primary">{title}</h3>
      {description && (
        <p className="text-xs text-tertiary mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
