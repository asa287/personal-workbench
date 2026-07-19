import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Collection } from "@/types";
import { genId, nowISO } from "@/lib/id";

interface CollectionState {
  collections: Collection[];
  addCollection: (
    input: Omit<Collection, "id" | "createdAt" | "updatedAt">
  ) => Collection;
  updateCollection: (id: string, patch: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  importCollections: (collections: Collection[], replace?: boolean) => void;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      collections: [],
      addCollection: (input) => {
        const now = nowISO();
        const collection: Collection = {
          ...input,
          id: genId("coll"),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ collections: [collection, ...s.collections] }));
        return collection;
      },
      updateCollection: (id, patch) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowISO() } : c
          ),
        })),
      deleteCollection: (id) =>
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
        })),
      importCollections: (collections, replace) =>
        set((s) => ({
          collections: replace ? collections : [...collections, ...s.collections],
        })),
    }),
    { name: "pwb:collections" }
  )
);
