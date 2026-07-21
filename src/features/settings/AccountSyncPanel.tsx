import { Cloud, Download, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSync } from "@/features/sync/SyncProvider";
import { buildExportBundle, downloadJSON } from "@/lib/importExport";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function AccountSyncPanel() {
  const { user, signOut } = useAuth();
  const sync = useSync();

  const exportBackup = () => {
    downloadJSON(
      `personal-workbench-${new Date().toISOString().slice(0, 10)}.json`,
      buildExportBundle()
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="账号"
          subtitle="你的工作台数据仅对当前登录账号可见"
        />
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">登录邮箱</div>
              <div className="mt-1 text-sm text-primary truncate">
                {user?.email}
              </div>
            </div>
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut size={14} />
              退出登录
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="跨设备同步"
          subtitle="本地缓存可离线使用，联网后自动同步至 Supabase"
        />
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-default bg-elevated p-3">
            <Cloud size={17} className="text-brand shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary">
                {sync.status === "synced"
                  ? "已同步"
                  : sync.status === "syncing"
                  ? "正在同步"
                  : sync.status === "offline"
                  ? "离线模式"
                  : sync.status === "conflict"
                  ? "需要处理数据冲突"
                  : "同步状态"}
              </div>
              <div className="text-xs text-tertiary mt-1">
                {sync.message || "登录后自动同步"}
              </div>
            </div>
          </div>

          {sync.status === "conflict" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => void sync.useCloudVersion()}
              >
                使用云端版本
              </Button>
              <Button
                variant="blue"
                onClick={() => void sync.useLocalVersion()}
              >
                使用此设备版本
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="blue" onClick={() => void sync.syncNow()}>
              <RefreshCw size={14} />
              立即同步
            </Button>
            <Button variant="outline" onClick={exportBackup}>
              <Download size={14} />
              导出本地备份
            </Button>
          </div>

          {sync.lastSyncedAt && (
            <p className="text-2xs text-muted">
              最近同步：
              {new Date(sync.lastSyncedAt).toLocaleString("zh-CN")}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
