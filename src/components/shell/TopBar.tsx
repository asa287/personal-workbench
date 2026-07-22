import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TOOL_META } from "@/lib/tools";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSync } from "@/features/sync/SyncProvider";
import {
  useWorkbench,
  useWorkbenchPath,
} from "@/features/workbench/WorkbenchContext";
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
  const { user, signOut } = useAuth();
  const sync = useSync();
  const { mode, basePath } = useWorkbench();
  const wb = useWorkbenchPath();
  const isDemo = mode === "demo";

  // 推断当前工具（兼容 /app 与 /try）
  const currentTool = Object.values(TOOL_META).find((t) => {
    const resolved = wb(t.path);
    return t.path === "/app" || t.path.endsWith("/app") || resolved === basePath
      ? location.pathname === basePath || location.pathname === `${basePath}/`
      : location.pathname.startsWith(resolved);
  });

  const [quickOpen, setQuickOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (path: string) => {
    setQuickOpen(false);
    navigate(wb(path));
  };

  return (
    <header className="h-14 shrink-0 bg-surface border-b border-default flex items-center gap-3 px-4 md:px-6">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <Tooltip
          content={currentTool?.description ?? "当前工作区"}
          placement="bottom"
        >
          <h1 className="text-sm font-semibold text-primary truncate cursor-help">
            {currentTool?.name ?? (isDemo ? "试用工作台" : "工作台")}
          </h1>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1.5">
        {rightExtra}

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

        {!isDemo && (
          <div ref={accountRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccountOpen((value) => !value)}
              aria-label="账号与同步"
              title={sync.message || "账号与同步"}
            >
              {sync.status === "offline" ? (
                <CloudOff size={16} />
              ) : sync.status === "conflict" || sync.status === "error" ? (
                <AlertTriangle size={16} className="text-warning" />
              ) : sync.status === "syncing" || sync.status === "loading" ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Cloud size={16} />
              )}
            </Button>

            {accountOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-72 bg-surface border border-default rounded-lg shadow-overlay p-3 z-40 animate-scale-in origin-top-right">
                <div className="flex items-start gap-2.5 pb-3 border-b border-default">
                  <UserCircle
                    size={20}
                    className="text-tertiary shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-primary truncate">
                      {user?.email ?? "已登录"}
                    </div>
                    <div className="text-2xs text-tertiary mt-0.5">
                      {sync.message || "同步服务已连接"}
                    </div>
                  </div>
                </div>

                {sync.status === "conflict" ? (
                  <div className="py-3 space-y-2">
                    <p className="text-xs text-warning">
                      此设备和云端都有修改，请选择保留的版本。
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void sync.useCloudVersion()}
                      >
                        使用云端
                      </Button>
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() => void sync.useLocalVersion()}
                      >
                        使用本地
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sync.syncNow()}
                    className="w-full flex items-center gap-2 py-2.5 text-xs text-secondary hover:text-primary"
                  >
                    <RefreshCw size={13} />
                    立即同步
                    {sync.lastSyncedAt && (
                      <span className="ml-auto text-2xs text-muted">
                        {new Date(sync.lastSyncedAt).toLocaleTimeString(
                          "zh-CN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-2 pt-2.5 border-t border-default text-xs text-tertiary hover:text-danger"
                >
                  <LogOut size={13} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="切换主题"
          title={theme === "dark" ? "切换到亮色" : "切换到暗色"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(wb("/settings"))}
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

export { QuickAddMenu };
export type { ToolId };
