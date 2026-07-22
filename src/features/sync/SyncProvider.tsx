import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ExportBundle } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  applySnapshot,
  buildExportBundle,
  downloadJSON,
  hasLocalUserData,
} from "@/lib/importExport";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { useToolStore } from "@/stores/useToolStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export type SyncStatus =
  | "idle"
  | "loading"
  | "syncing"
  | "synced"
  | "offline"
  | "conflict"
  | "error";

interface SyncContextValue {
  status: SyncStatus;
  message: string;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  useLocalVersion: () => Promise<void>;
  useCloudVersion: () => Promise<void>;
}

interface SnapshotRow {
  user_id: string;
  payload: ExportBundle;
  revision: number;
  updated_at: string;
}

interface SyncMeta {
  revision: number;
  dirty: boolean;
  lastSyncedAt: string | null;
}

const DEFAULT_META: SyncMeta = {
  revision: 0,
  dirty: false,
  lastSyncedAt: null,
};

const SyncContext = createContext<SyncContextValue | null>(null);
const STORE_SUBSCRIBERS = [
  useTaskStore,
  useProjectStore,
  useCollectionStore,
  useIELTSStore,
  useContentStore,
  useCultureStore,
  useToolStore,
  useSettingsStore,
] as const;

function metaKey(userId: string) {
  return `pwb:sync-meta:${userId}`;
}

function readMeta(userId: string): SyncMeta {
  try {
    const raw = localStorage.getItem(metaKey(userId));
    return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : DEFAULT_META;
  } catch {
    return DEFAULT_META;
  }
}

function writeMeta(userId: string, meta: SyncMeta) {
  localStorage.setItem(metaKey(userId), JSON.stringify(meta));
  localStorage.setItem("pwb:sync-user", userId);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [cloudAtMigration, setCloudAtMigration] =
    useState<SnapshotRow | null>(null);

  const userIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const uploadingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const remoteConflictRef = useRef<SnapshotRow | null>(null);

  const updateMeta = useCallback(
    (patch: Partial<SyncMeta>) => {
      const userId = userIdRef.current;
      if (!userId) return;
      const next = { ...readMeta(userId), ...patch };
      writeMeta(userId, next);
      if (patch.lastSyncedAt !== undefined) {
        setLastSyncedAt(patch.lastSyncedAt);
      }
    },
    []
  );

  const applyCloudRow = useCallback(
    (row: SnapshotRow) => {
      applyingRemoteRef.current = true;
      const result = applySnapshot(row.payload);
      applyingRemoteRef.current = false;
      if (!result.ok) throw new Error(result.message);
      revisionRef.current = row.revision;
      remoteConflictRef.current = null;
      updateMeta({
        revision: row.revision,
        dirty: false,
        lastSyncedAt: row.updated_at,
      });
      setStatus("synced");
      setMessage("云端数据已同步");
    },
    [updateMeta]
  );

  const uploadSnapshot = useCallback(
    async (force = false) => {
      const userId = userIdRef.current;
      if (!userId || !supabase || uploadingRef.current) return;
      uploadingRef.current = true;
      setStatus("syncing");
      setMessage("正在同步到云端…");
      try {
        const payload = buildExportBundle();
        let row: SnapshotRow | null = null;

        if (revisionRef.current === 0) {
          const { data, error } = await supabase
            .from("workbench_snapshots")
            .insert({ user_id: userId, payload })
            .select()
            .single();
          if (error) throw error;
          row = data as SnapshotRow;
        } else {
          let query = supabase
            .from("workbench_snapshots")
            .update({ payload })
            .eq("user_id", userId);
          if (!force) query = query.eq("revision", revisionRef.current);
          const { data, error } = await query.select().maybeSingle();
          if (error) throw error;
          row = data as SnapshotRow | null;
          if (!row) {
            remoteConflictRef.current = null;
            setStatus("conflict");
            setMessage("云端已有更新，请选择保留本地或云端版本");
            return;
          }
        }

        revisionRef.current = row.revision;
        updateMeta({
          revision: row.revision,
          dirty: false,
          lastSyncedAt: row.updated_at,
        });
        setStatus("synced");
        setMessage("已同步");
      } catch (cause) {
        updateMeta({ dirty: true });
        if (!navigator.onLine) {
          setStatus("offline");
          setMessage("当前离线，数据已保存在此设备");
        } else {
          setStatus("error");
          setMessage(cause instanceof Error ? cause.message : "同步失败");
        }
      } finally {
        uploadingRef.current = false;
      }
    },
    [updateMeta]
  );

  const fetchCloudRow = useCallback(async (): Promise<SnapshotRow | null> => {
    const userId = userIdRef.current;
    if (!userId || !supabase) return null;
    const { data, error } = await supabase
      .from("workbench_snapshots")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as SnapshotRow | null;
  }, []);

  const scheduleUpload = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId || !readyRef.current || applyingRemoteRef.current) return;
    updateMeta({ dirty: true });
    setStatus(navigator.onLine ? "syncing" : "offline");
    setMessage(
      navigator.onLine ? "等待同步…" : "当前离线，数据已保存在此设备"
    );
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void uploadSnapshot(), 1200);
  }, [updateMeta, uploadSnapshot]);

  const initialize = useCallback(async () => {
    if (!user || !supabase) return;
    userIdRef.current = user.id;
    readyRef.current = false;
    setStatus("loading");
    setMessage("正在读取云端数据…");

    try {
      const cloud = await fetchCloudRow();
      const local = buildExportBundle();
      const localHasData = hasLocalUserData(local);
      const linkedUser = localStorage.getItem("pwb:sync-user");
      const meta = readMeta(user.id);
      setLastSyncedAt(meta.lastSyncedAt);

      if (linkedUser !== user.id && localHasData && cloud) {
        revisionRef.current = cloud.revision;
        setCloudAtMigration(cloud);
        setMigrationOpen(true);
        setStatus("idle");
        setMessage("请选择首次同步方式");
        return;
      }

      if (cloud) {
        revisionRef.current = cloud.revision;
        if (linkedUser === user.id && meta.dirty) {
          if (meta.revision === cloud.revision) {
            await uploadSnapshot();
          } else {
            remoteConflictRef.current = cloud;
            setStatus("conflict");
            setMessage("此设备和云端都有未合并的修改");
          }
        } else {
          applyCloudRow(cloud);
        }
      } else {
        revisionRef.current = 0;
        await uploadSnapshot();
      }
      readyRef.current = true;
    } catch (cause) {
      setStatus(navigator.onLine ? "error" : "offline");
      setMessage(cause instanceof Error ? cause.message : "初始化同步失败");
      readyRef.current = true;
    }
  }, [
    applyCloudRow,
    fetchCloudRow,
    uploadSnapshot,
    user,
  ]);

  useEffect(() => {
    if (!user || !supabase) {
      userIdRef.current = null;
      readyRef.current = false;
      setStatus("idle");
      return;
    }

    void initialize();
    const unsubs = STORE_SUBSCRIBERS.map((store) =>
      store.subscribe(scheduleUpload)
    );

    channelRef.current = supabase
      .channel(`workbench:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workbench_snapshots",
          filter: `user_id=eq.${user.id}`,
        },
        (event) => {
          const row = event.new as SnapshotRow;
          if (
            uploadingRef.current ||
            row.revision <= revisionRef.current ||
            !readyRef.current
          ) {
            return;
          }
          if (readMeta(user.id).dirty) {
            remoteConflictRef.current = row;
            setStatus("conflict");
            setMessage("另一台设备有新修改");
            return;
          }
          try {
            applyCloudRow(row);
          } catch (cause) {
            setStatus("error");
            setMessage(cause instanceof Error ? cause.message : "应用云端数据失败");
          }
        }
      )
      .subscribe();

    const onOnline = () => {
      if (readMeta(user.id).dirty) void uploadSnapshot();
    };
    const onOffline = () => {
      setStatus("offline");
      setMessage("当前离线，数据已保存在此设备");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current);
      }
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      readyRef.current = false;
    };
  }, [applyCloudRow, initialize, scheduleUpload, uploadSnapshot, user]);

  const chooseLocal = async () => {
    setMigrationOpen(false);
    readyRef.current = true;
    writeMeta(user!.id, {
      revision: cloudAtMigration?.revision ?? 0,
      dirty: true,
      lastSyncedAt: null,
    });
    revisionRef.current = cloudAtMigration?.revision ?? 0;
    await uploadSnapshot(true);
  };

  const chooseCloud = async () => {
    if (!cloudAtMigration) return;
    downloadJSON(
      `personal-workbench-local-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`,
      buildExportBundle()
    );
    applyCloudRow(cloudAtMigration);
    setMigrationOpen(false);
    readyRef.current = true;
  };

  const useCloudVersion = useCallback(async () => {
    try {
      const cloud = remoteConflictRef.current ?? (await fetchCloudRow());
      if (!cloud) return;
      downloadJSON(
        `personal-workbench-conflict-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
        buildExportBundle()
      );
      applyCloudRow(cloud);
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "读取云端版本失败");
    }
  }, [applyCloudRow, fetchCloudRow]);

  const useLocalVersion = useCallback(async () => {
    try {
      const cloud = await fetchCloudRow();
      if (cloud) revisionRef.current = cloud.revision;
      await uploadSnapshot(true);
      remoteConflictRef.current = null;
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "保存本地版本失败");
    }
  }, [fetchCloudRow, uploadSnapshot]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      message,
      lastSyncedAt,
      syncNow: () => uploadSnapshot(),
      useLocalVersion,
      useCloudVersion,
    }),
    [
      lastSyncedAt,
      message,
      status,
      uploadSnapshot,
      useCloudVersion,
      useLocalVersion,
    ]
  );

  return (
    <SyncContext.Provider value={value}>
      {children}
      <Modal
        open={migrationOpen}
        onClose={() => undefined}
        title="选择首次同步方式"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => void chooseCloud()}>
              使用云端数据
            </Button>
            <Button variant="blue" onClick={() => void chooseLocal()}>
              上传此设备数据
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-secondary">
          <p>检测到此设备和云端都已有工作台数据。</p>
          <p>
            请选择要保留的版本。选择云端数据前，会自动下载当前设备数据作为
            JSON 备份。
          </p>
        </div>
      </Modal>
    </SyncContext.Provider>
  );
}

export function useSync() {
  const value = useContext(SyncContext);
  if (!value) {
    return {
      status: "idle" as const,
      message: "本地试用，不同步云端",
      lastSyncedAt: null,
      syncNow: async () => undefined,
      useLocalVersion: async () => undefined,
      useCloudVersion: async () => undefined,
    };
  }
  return value;
}
