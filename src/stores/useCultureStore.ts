import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CultureItem, Excerpt } from "@/types";
import { genId, nowISO } from "@/lib/id";
import { createScopedJSONStorage } from "@/lib/storageScope";

interface CultureState {
  items: CultureItem[];
  addItem: (input: Omit<CultureItem, "id" | "createdAt" | "updatedAt">) => CultureItem;
  updateItem: (id: string, patch: Partial<CultureItem>) => void;
  deleteItem: (id: string) => void;

  // 摘录操作
  addExcerpt: (cultureId: string, content: string) => void;
  updateExcerpt: (
    cultureId: string,
    excerptId: string,
    patch: Partial<Excerpt>
  ) => void;
  deleteExcerpt: (cultureId: string, excerptId: string) => void;
  toggleExcerptMaterial: (cultureId: string, excerptId: string) => void;

  importItems: (items: CultureItem[], replace?: boolean) => void;
}

export const useCultureStore = create<CultureState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (input) => {
        const now = nowISO();
        const item: CultureItem = {
          ...input,
          id: genId("culture"),
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

      addExcerpt: (cultureId, content) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === cultureId
              ? {
                  ...i,
                  excerpts: [
                    ...i.excerpts,
                    {
                      id: genId("exc"),
                      content,
                      isMaterial: false,
                      linkedContentIds: [],
                    },
                  ],
                  updatedAt: nowISO(),
                }
              : i
          ),
        })),
      updateExcerpt: (cultureId, excerptId, patch) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === cultureId
              ? {
                  ...i,
                  excerpts: i.excerpts.map((e) =>
                    e.id === excerptId ? { ...e, ...patch } : e
                  ),
                  updatedAt: nowISO(),
                }
              : i
          ),
        })),
      deleteExcerpt: (cultureId, excerptId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === cultureId
              ? {
                  ...i,
                  excerpts: i.excerpts.filter((e) => e.id !== excerptId),
                  updatedAt: nowISO(),
                }
              : i
          ),
        })),
      toggleExcerptMaterial: (cultureId, excerptId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === cultureId
              ? {
                  ...i,
                  excerpts: i.excerpts.map((e) =>
                    e.id === excerptId
                      ? { ...e, isMaterial: !e.isMaterial }
                      : e
                  ),
                  updatedAt: nowISO(),
                }
              : i
          ),
        })),

      importItems: (items, replace) =>
        set((s) => ({
          items: replace ? items : [...items, ...s.items],
        })),
    }),
    { name: "pwb:culture", storage: createScopedJSONStorage() }
  )
);
