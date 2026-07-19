import { useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Placement = "top" | "bottom" | "left" | "right";

const TIP_WIDTH = 280;

/**
 * 轻量 Tooltip：hover/focus 触发，定位跟随目标元素。
 * 用于把"页面级解释文本"从常显改为悬浮显示，减少视觉杂乱。
 */
export function Tooltip({
  content,
  children,
  placement = "bottom",
  delay = 100,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
  delay?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const targetRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = targetRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let top = r.bottom + 8;
      let left = r.left + r.width / 2 - TIP_WIDTH / 2;
      if (placement === "top") top = r.top - 8 - 60;
      // 边界修正
      if (left < 8) left = 8;
      if (left + TIP_WIDTH > window.innerWidth - 8)
        left = window.innerWidth - 8 - TIP_WIDTH;
      setCoords({ top, left });
      setOpen(true);
    }, delay);
  };

  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={targetRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={cn("inline-flex", className)}
      >
        {children}
      </span>
      {open &&
        coords &&
        createPortal(
          <div
            role="tooltip"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${TIP_WIDTH}px`,
            }}
            className="fixed z-[60] px-3 py-2 rounded-md bg-elevated border border-strong shadow-overlay text-xs text-secondary leading-relaxed animate-fade-in pointer-events-none"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
