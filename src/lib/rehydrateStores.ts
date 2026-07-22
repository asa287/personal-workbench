import { setStorageScope, type StorageScope } from "@/lib/storageScope";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { useToolStore } from "@/stores/useToolStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const PERSISTED_STORES = [
  useTaskStore,
  useProjectStore,
  useCollectionStore,
  useIELTSStore,
  useContentStore,
  useCultureStore,
  useToolStore,
  useSettingsStore,
] as const;

/** 切换命名空间并重新从 localStorage 灌入所有 persist store */
export async function setScopeAndRehydrate(scope: StorageScope): Promise<void> {
  setStorageScope(scope);
  await Promise.all(PERSISTED_STORES.map((s) => s.persist.rehydrate()));
}
