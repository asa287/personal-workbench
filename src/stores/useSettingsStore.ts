import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";

interface SettingsState extends AppSettings {
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  importSettings: (s: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      importSettings: (s) => set(s),
    }),
    { name: "pwb:settings" }
  )
);
