import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlay?: boolean;
}

const SIZE_MAP = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full bg-surface border border-default rounded-xl shadow-overlay animate-scale-in",
          "flex flex-col max-h-[90vh]",
          SIZE_MAP[size]
        )}
      >
        {(title || description) && (
          <div className="px-5 pt-5 pb-4 border-b border-default">
            {title && (
              <h2 className="text-base font-semibold text-primary">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-tertiary mt-1">{description}</p>
            )}
          </div>
        )}
        <button
          aria-label="关闭"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-default flex items-center justify-end gap-2 bg-elevated/40">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
