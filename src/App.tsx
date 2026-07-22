import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { SyncProvider } from "@/features/sync/SyncProvider";
import { PublicLayout } from "@/features/public/PublicLayout";
import { PublishWatcher } from "@/features/public/PublishWatcher";
import {
  WorkbenchProvider,
  type WorkbenchMode,
} from "@/features/workbench/WorkbenchContext";
import { setScopeAndRehydrate } from "@/lib/rehydrateStores";
import type { StorageScope } from "@/lib/storageScope";
import { seedDemoIfEmpty } from "@/features/sandbox/seedDemoData";
import { cn } from "@/lib/cn";

const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const PublicHomePage = lazy(() => import("@/features/public/PublicHomePage"));
const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const TasksPage = lazy(() => import("@/features/tasks/TasksPage"));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage"));
const IELTSPage = lazy(() => import("@/features/ielts/IELTSPage"));
const MediaPage = lazy(() => import("@/features/media/MediaPage"));
const CulturePage = lazy(() => import("@/features/culture/CulturePage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center text-tertiary text-sm">
      加载中…
    </div>
  );
}

/** 进入 /app 或 /try 时切换存储命名空间并 rehydrate */
function ScopeBootstrap({
  scope,
  children,
}: {
  scope: StorageScope;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    void setScopeAndRehydrate(scope).then(() => {
      if (!active) return;
      if (scope === "demo") seedDemoIfEmpty();
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  if (!ready) return <Loading />;
  return children;
}

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PublicLayout />}>
          <Route path="/" element={<PublicHomePage />} />
        </Route>

        <Route
          path="/try/*"
          element={
            <ScopeBootstrap scope="demo">
              <WorkbenchProvider mode="demo">
                <WorkbenchShell mode="demo" />
              </WorkbenchProvider>
            </ScopeBootstrap>
          }
        />

        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <ScopeBootstrap scope="app">
                <WorkbenchProvider mode="app">
                  <SyncProvider>
                    <PublishWatcher />
                    <WorkbenchShell mode="app" />
                  </SyncProvider>
                </WorkbenchProvider>
              </ScopeBootstrap>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function WorkbenchShell({ mode }: { mode: WorkbenchMode }) {
  return (
    <div className="h-full flex flex-col bg-app text-primary">
      {mode === "demo" && <SandboxBanner />}
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main
            className={cn(
              "flex-1 overflow-y-auto",
              "pb-16 md:pb-0"
            )}
          >
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="" element={<Dashboard />} />
                <Route path="tasks/*" element={<TasksPage />} />
                <Route path="projects/*" element={<ProjectsPage />} />
                <Route path="ielts/*" element={<IELTSPage />} />
                <Route path="media/*" element={<MediaPage />} />
                <Route path="culture/*" element={<CulturePage />} />
                <Route path="settings/*" element={<SettingsPage />} />
                <Route
                  path="*"
                  element={
                    <Navigate to={mode === "demo" ? "/try" : "/app"} replace />
                  }
                />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

function SandboxBanner() {
  return (
    <div className="shrink-0 border-b border-brand-border bg-brand-soft px-4 py-2.5 text-xs text-secondary flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <p className="flex-1 leading-relaxed">
        <span className="font-medium text-primary">本地试用沙箱</span>
        ——数据仅保存在本浏览器（
        <code className="font-mono text-2xs">pwb-demo</code>
        ），清除站点数据会丢失。不登录、不同步云端。
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/login" className="text-brand hover:underline font-medium">
          邀请码注册 / 登录
        </Link>
        <Link to="/" className="text-tertiary hover:text-primary">
          返回主页
        </Link>
      </div>
    </div>
  );
}
