import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentItem } from "@/types";
import { genId, nowISO } from "@/lib/id";
import { createScopedJSONStorage } from "@/lib/storageScope";

interface ContentState {
  items: ContentItem[];
  addItem: (input: Omit<ContentItem, "id" | "createdAt" | "updatedAt">) => ContentItem;
  updateItem: (id: string, patch: Partial<ContentItem>) => void;
  deleteItem: (id: string) => void;
  setStatus: (id: string, status: ContentItem["status"]) => void;
  importItems: (items: ContentItem[], replace?: boolean) => void;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (input) => {
        const now = nowISO();
        const item: ContentItem = {
          ...input,
          id: genId("content"),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ items: [item, ...s.items] }));
        return item;
      },
      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, ...patch, updatedAt: nowISO() } : i
          ),
        })),
      deleteItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status, updatedAt: nowISO() } : i
          ),
        })),
      importItems: (items, replace) =>
        set((s) => ({
          items: replace ? items : [...items, ...s.items],
        })),
    }),
    { name: "pwb:content", storage: createScopedJSONStorage() }
  )
);
