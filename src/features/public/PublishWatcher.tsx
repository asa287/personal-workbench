import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { publishPublicProjection } from "@/features/public/publishProjection";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { getStorageScope } from "@/lib/storageScope";

/**
 * 在 /app 且同步可用时，监听公开相关 store 变更并防抖重建公开投影。
 */
export function PublishWatcher() {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (getStorageScope() !== "app") return;

    const schedule = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void publishPublicProjection({ ownerId: user?.id ?? null }).catch(
          () => {
            // 本地投影仍会写入；云端失败静默（手动发布可看错误）
          }
        );
      }, 1000);
    };

    const unsubs = [
      useProjectStore.subscribe(schedule),
      useCultureStore.subscribe(schedule),
      useContentStore.subscribe(schedule),
    ];

    return () => {
      unsubs.forEach((u) => u());
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [user?.id]);

  return null;
}
