import { createContext, useContext, type ReactNode } from "react";
import type { StorageScope } from "@/lib/storageScope";

export type WorkbenchMode = "app" | "demo";

interface WorkbenchContextValue {
  mode: WorkbenchMode;
  basePath: "/app" | "/try";
  scope: StorageScope;
}

const WorkbenchContext = createContext<WorkbenchContextValue>({
  mode: "app",
  basePath: "/app",
  scope: "app",
});

export function WorkbenchProvider({
  mode,
  children,
}: {
  mode: WorkbenchMode;
  children: ReactNode;
}) {
  const value: WorkbenchContextValue =
    mode === "demo"
      ? { mode: "demo", basePath: "/try", scope: "demo" }
      : { mode: "app", basePath: "/app", scope: "app" };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  return useContext(WorkbenchContext);
}

/**
 * 将工作台相对路径解析为当前 basePath 下的绝对路径。
 * 例：wbPath("/tasks?new=1") → "/app/tasks?new=1" 或 "/try/tasks?new=1"
 * 也兼容传入 "/app/tasks" 形式。
 */
export function useWorkbenchPath() {
  const { basePath } = useWorkbench();
  return (path = "") => {
    if (!path || path === "/" || path === basePath) return basePath;
    const stripped = path
      .replace(/^\/app/, "")
      .replace(/^\/try/, "")
      .replace(/^\//, "");
    if (!stripped) return basePath;
    // 保留 query
    const [pathname, query] = stripped.split("?");
    const full = `${basePath}/${pathname}`;
    return query ? `${full}?${query}` : full;
  };
}
