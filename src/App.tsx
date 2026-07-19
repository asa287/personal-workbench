import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { cn } from "@/lib/cn";

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

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return (
    <div className="h-full flex bg-app text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            "pb-16 md:pb-0" // 移动端底部 tab 占位
          )}
        >
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks/*" element={<TasksPage />} />
              <Route path="/projects/*" element={<ProjectsPage />} />
              <Route path="/ielts/*" element={<IELTSPage />} />
              <Route path="/media/*" element={<MediaPage />} />
              <Route path="/culture/*" element={<CulturePage />} />
              <Route path="/settings/*" element={<SettingsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
