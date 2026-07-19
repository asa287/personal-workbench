import { useLocation, useNavigate } from "react-router-dom";
import { Settings, Plus, Sun, Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TOOL_META } from "@/lib/tools";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import type { ToolId } from "@/types";
import { QuickAddMenu } from "./QuickAddMenu";

export function TopBar({
  rightExtra,
}: {
  rightExtra?: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  // 推断当前工具
  const currentTool = Object.values(TOOL_META).find((t) =>
    t.path === "/" ? location.pathname === "/" : location.pathname.startsWith(t.path)
  );

  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (path: string) => {
    setQuickOpen(false);
    navigate(path);
  };

  return (
    <header className="h-14 shrink-0 bg-surface border-b border-default flex items-center gap-3 px-4 md:px-6">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <Tooltip
          content={currentTool?.description ?? "当前工作区"}
          placement="bottom"
        >
          <h1 className="text-sm font-semibold text-primary truncate cursor-help">
            {currentTool?.name ?? "工作台"}
          </h1>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1.5">
        {rightExtra}

        {/* 快速新增 */}
        <div ref={quickRef} className="relative">
          <Button
            variant="blue"
            size="sm"
            onClick={() => setQuickOpen((v) => !v)}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">快速新增</span>
          </Button>
          {quickOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-44 bg-surface border border-default rounded-lg shadow-overlay p-1 z-40 animate-scale-in origin-top-right">
              <QuickAddMenuItem onClick={() => go("/tasks?new=1")}>
                新建待办
              </QuickAddMenuItem>
              <QuickAddMenuItem onClick={() => go("/projects?new=1")}>
                新建项目
              </QuickAddMenuItem>
              <QuickAddMenuItem onClick={() => go("/culture?new=1")}>
                记录积累
              </QuickAddMenuItem>
              <QuickAddMenuItem onClick={() => go("/ielts?tab=checkin&new=1")}>
                雅思打卡
              </QuickAddMenuItem>
              <QuickAddMenuItem onClick={() => go("/media?new=1")}>
                自媒体选题
              </QuickAddMenuItem>
            </div>
          )}
        </div>

        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="切换主题"
          title={theme === "dark" ? "切换到亮色" : "切换到暗色"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* 设置 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
          aria-label="设置"
        >
          <Settings size={16} />
        </Button>
      </div>
    </header>
  );
}

function QuickAddMenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-2.5 py-1.5 rounded-md text-sm",
        "text-secondary hover:text-primary hover:bg-hover transition-colors"
      )}
    >
      {children}
    </button>
  );
}

// 占位：未使用的导出，方便后续扩展
export { QuickAddMenu };
export type { ToolId };
