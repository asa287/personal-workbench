import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "blue";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white",
  secondary:
    "bg-elevated text-primary border border-default hover:bg-hover",
  ghost: "text-secondary hover:text-primary hover:bg-hover",
  danger:
    "bg-danger text-white hover:brightness-110",
  outline:
    "border border-strong text-primary hover:bg-hover",
  blue: "bg-brand text-white hover:bg-brand-hover border border-transparent",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs rounded-md gap-1",
  md: "h-9 px-3.5 text-sm rounded-md gap-1.5",
  lg: "h-11 px-5 text-sm rounded-lg gap-2",
  icon: "h-8 w-8 rounded-md justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
          "disabled:opacity-40 disabled:pointer-events-none",
          "whitespace-nowrap select-none",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
