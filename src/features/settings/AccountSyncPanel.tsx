import { Cloud, Download, Globe, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSync } from "@/features/sync/SyncProvider";
import { publishPublicProjection } from "@/features/public/publishProjection";
import { useWorkbench } from "@/features/workbench/WorkbenchContext";
import { buildExportBundle, downloadJSON } from "@/lib/importExport";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function AccountSyncPanel() {
  const { user, signOut } = useAuth();
  const sync = useSync();
  const { mode } = useWorkbench();
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");
  const [publishErr, setPublishErr] = useState("");

  const exportBackup = () => {
    downloadJSON(
      `personal-workbench-${new Date().toISOString().slice(0, 10)}.json`,
      buildExportBundle()
    );
  };

  const publishNow = async () => {
    setPublishMsg("");
    setPublishErr("");
    setPublishBusy(true);
    try {
      const projection = await publishPublicProjection({
        ownerId: user?.id ?? null,
      });
      setPublishMsg(
        `已发布：${projection.projects.length} 个项目、${projection.culture.length} 条积累、${projection.links.length} 条内容链接`
      );
    } catch (cause) {
      setPublishErr(
        cause instanceof Error ? cause.message : "发布失败，请稍后重试"
      );
    } finally {
      setPublishBusy(false);
    }
  };

  if (mode === "demo") {
    return (
      <Card>
        <CardHeader
          title="试用模式"
          subtitle="本地沙箱不同步云端，也不发布到个人网站"
        />
        <CardBody className="text-sm text-secondary space-y-3">
          <p>数据保存在浏览器 `pwb-demo:*` 命名空间。清除站点数据即丢失。</p>
          <Button variant="outline" onClick={exportBackup}>
            <Download size={14} />
            导出本地备份
          </Button>
        </CardBody>
      </Card>
    );
  }

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

      <Card>
        <CardHeader
          title="个人网站发布"
          subtitle="将标记为公开的项目 / 积累 / 内容投影到公开主页"
        />
        <CardBody className="space-y-3">
          <p className="text-sm text-secondary">
            在对应表单勾选「发布到个人网站」后，系统会自动重建公开投影；也可手动立即发布。
          </p>
          <Button
            variant="blue"
            disabled={publishBusy}
            onClick={() => void publishNow()}
          >
            <Globe size={14} />
            {publishBusy ? "发布中…" : "立即发布到个人网站"}
          </Button>
          {publishMsg && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {publishMsg}
            </p>
          )}
          {publishErr && <p className="text-sm text-danger">{publishErr}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
