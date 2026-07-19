import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolConfig, ToolId } from "@/types";

const DEFAULT_TOOLS: ToolConfig[] = [
  { id: "tasks", visible: true, order: 1 },
  { id: "projects", visible: true, order: 2 },
  { id: "ielts", visible: true, order: 3 },
  { id: "media", visible: true, order: 4 },
  { id: "culture", visible: true, order: 5 },
];

interface ToolState {
  tools: ToolConfig[];
  setVisible: (id: ToolId, visible: boolean) => void;
  reorder: (orderedIds: ToolId[]) => void;
  reset: () => void;
  importTools: (tools: ToolConfig[]) => void;
}

export const useToolStore = create<ToolState>()(
  persist(
    (set) => ({
      tools: DEFAULT_TOOLS,
      setVisible: (id, visible) =>
        set((s) => ({
          tools: s.tools.map((t) => (t.id === id ? { ...t, visible } : t)),
        })),
      reorder: (orderedIds) =>
        set((s) => ({
          tools: s.tools.map((t) => {
            const idx = orderedIds.indexOf(t.id);
            return idx === -1 ? t : { ...t, order: idx + 1 };
          }),
        })),
      reset: () => set({ tools: DEFAULT_TOOLS }),
      importTools: (tools) => set({ tools }),
    }),
    { name: "pwb:tools" }
  )
);
