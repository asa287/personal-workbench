import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** 工作台存储命名空间：正式账号 vs 本地试用沙箱 */
export type StorageScope = "app" | "demo";

const PREFIX: Record<StorageScope, string> = {
  app: "pwb",
  demo: "pwb-demo",
};

let currentScope: StorageScope = "app";

export function getStorageScope(): StorageScope {
  return currentScope;
}

export function setStorageScope(scope: StorageScope) {
  currentScope = scope;
}

/**
 * 将 zustand persist 的 name（如 `pwb:projects`）映射到当前 scope 的真实 key。
 * app → pwb:* ；demo → pwb-demo:*
 */
export function scopedStorageKey(name: string): string {
  const bare = name.replace(/^pwb(-demo)?:/, "");
  return `${PREFIX[currentScope]}:${bare}`;
}

/** 按 scope 读写的 localStorage 包装 */
export const scopedLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(scopedStorageKey(name));
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(scopedStorageKey(name), value);
    } catch {
      // ignore quota / private mode
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(scopedStorageKey(name));
    } catch {
      // ignore
    }
  },
};

/** zustand persist 用的 JSON storage（动态跟随当前 scope） */
export function createScopedJSONStorage() {
  return createJSONStorage(() => scopedLocalStorage);
}
