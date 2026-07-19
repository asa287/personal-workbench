import { useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudUpload,
  CloudDownload,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  buildExportBundle,
  downloadJSON,
  downloadCSV,
  importFromBundle,
  readJSONFile,
  type ImportResult,
} from "@/lib/importExport";
import { cn } from "@/lib/cn";

// 可导出 CSV 的模块
type CsvModule =
  | "tasks"
  | "projects"
  | "ieltsPlan"
  | "ieltsCheckin"
  | "ieltsErrors"
  | "ieltsMock"
  | "content"
  | "culture";

const CSV_MODULE_OPTIONS: { value: CsvModule; label: string }[] = [
  { value: "tasks", label: "待办任务" },
  { value: "projects", label: "项目" },
  { value: "ieltsPlan", label: "雅思计划" },
  { value: "ieltsCheckin", label: "雅思打卡" },
  { value: "ieltsErrors", label: "雅思错题" },
  { value: "ieltsMock", label: "雅思模考" },
  { value: "content", label: "自媒体内容" },
  { value: "culture", label: "个人积累" },
];

// 把日期格式化为 yyyyMMdd 用于文件名
function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function DataManager() {
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const ieltsPlans = useIELTSStore((s) => s.plans);
  const ieltsCheckins = useIELTSStore((s) => s.checkins);
  const ieltsErrors = useIELTSStore((s) => s.errors);
  const ieltsMocks = useIELTSStore((s) => s.mocks);
  const content = useContentStore((s) => s.items);
  const culture = useCultureStore((s) => s.items);

  const [csvModule, setCsvModule] = useState<CsvModule>("tasks");
  // 导入流程：先读取文件，再弹窗选择覆盖/合并
  const [pendingBundle, setPendingBundle] = useState<unknown>(null);
  const [importChooseOpen, setImportChooseOpen] = useState(false);
  // 导入结果
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  // 清空确认
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState("");

  // 云端备份（双平台：Gitee + GitHub）
  type CloudPlatform = "gitee" | "github";
  interface PlatformSettings {
    token: string;
    repo: string;
    file: string;
  }
  const [cloudSettings, setCloudSettings] = useState<Record<CloudPlatform, PlatformSettings>>({
    gitee: { token: "", repo: "", file: "backup.json" },
    github: { token: "", repo: "", file: "backup.json" },
  });
  const [giteeExpanded, setGiteeExpanded] = useState(false);
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<Record<CloudPlatform, { status: "idle" | "uploading" | "downloading" | "success" | "error"; message: string }>>({
    gitee: { status: "idle", message: "" },
    github: { status: "idle", message: "" },
  });
  const [saveFeedback, setSaveFeedback] = useState<"saved" | "saving" | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载保存的云端设置
  useState(() => {
    const saved = localStorage.getItem("pwb:cloud-settings");
    if (saved) {
      try {
        setCloudSettings(JSON.parse(saved));
      } catch {}
    }
  });

  // 保存云端设置
  const saveCloudSettings = () => {
    localStorage.setItem("pwb:cloud-settings", JSON.stringify(cloudSettings));
    setSaveFeedback("saved");
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // 通用备份函数
  const doBackup = async (platform: CloudPlatform) => {
    const settings = cloudSettings[platform];
    if (!settings.token || !settings.repo) {
      setCloudStatus((s) => ({
        ...s,
        [platform]: { status: "error", message: platform === "gitee" ? "请先填写 Gitee 私人令牌和仓库地址" : "请先填写 GitHub 个人访问令牌和仓库地址" },
      }));
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, [platform]: { status: "idle", message: "" } }));
      }, 5000);
      return false;
    }
    const [owner, repoName] = settings.repo.split("/");
    if (!owner || !repoName) {
      setCloudStatus((s) => ({
        ...s,
        [platform]: { status: "error", message: `仓库地址格式错误，请填写：用户名/仓库名（如 zhangsan/my-repo）` },
      }));
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, [platform]: { status: "idle", message: "" } }));
      }, 5000);
      return false;
    }
    saveCloudSettings();
    setCloudStatus((s) => ({
      ...s,
      [platform]: { status: "uploading", message: platform === "gitee" ? "正在备份到 Gitee..." : "正在备份到 GitHub..." },
    }));
    try {
      const bundle = buildExportBundle();
      const content = JSON.stringify(bundle, null, 2);
      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const url = platform === "gitee"
        ? `https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${settings.file}`
        : `https://api.github.com/repos/${owner}/${repoName}/contents/${settings.file}`;

      let sha = "";
      try {
        const getRes = await fetch(url, {
          headers: {
            Authorization: platform === "gitee" ? `token ${settings.token}` : `token ${settings.token}`,
          },
        });
        if (getRes.ok) {
          const getBody = await getRes.json();
          sha = getBody.sha || "";
        }
      } catch {}

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: platform === "gitee" ? `token ${settings.token}` : `token ${settings.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "message": `Backup ${dateStamp()}`,
          content: encodedContent,
          branch: platform === "gitee" ? "master" : "main",
          ...(sha && { sha }),
        }),
      });
      let data;
      let errorMsg = "";
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          errorMsg = "API 返回了 HTML 页面，可能是令牌无效或网络问题";
        } else {
          errorMsg = `API 返回格式错误: ${text.substring(0, 100)}`;
        }
        setCloudStatus((s) => ({
          ...s,
          [platform]: { status: "error", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 备份失败：${errorMsg}` },
        }));
        return false;
      }
      if (res.ok) {
        setCloudStatus((s) => ({
          ...s,
          [platform]: { status: "success", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 备份成功！文件路径：${data.content?.path || settings.file}` },
        }));
        return true;
      } else {
        let errorMsg = data.message || "未知错误";
        if (!data.message) {
          const statusText = res.statusText || "";
          const errorFields = Object.keys(data).filter((k) => k.toLowerCase().includes("error") || k.toLowerCase().includes("message"));
          const additionalInfo = errorFields.length > 0
            ? `（${errorFields.map((f) => `${f}: ${String(data[f])}`).join("；")}）`
            : "";
          errorMsg = `HTTP ${res.status} ${statusText}${additionalInfo}`;
        }
        if (platform === "gitee" && (errorMsg.includes("Not found project") || errorMsg.includes("404"))) {
          errorMsg = "仓库不存在或令牌权限不足。请检查：1. 仓库地址格式是否为 用户名/仓库名；2. 令牌是否勾选了 projects 权限；3. 仓库是否为私有";
        }
        if (platform === "gitee" && (errorMsg.includes("unauthorized") || errorMsg.includes("401"))) {
          errorMsg = "令牌无效或权限不足。请重新生成令牌并确保勾选了 projects 权限";
        }
        if (platform === "github" && (errorMsg.includes("Not Found") || errorMsg.includes("404"))) {
          errorMsg = "仓库不存在或令牌权限不足。请检查：1. 仓库地址格式是否正确；2. 令牌是否勾选了 repo 权限";
        }
        setCloudStatus((s) => ({
          ...s,
          [platform]: { status: "error", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 备份失败：${errorMsg}` },
        }));
        return false;
      }
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("NetworkError") || errorMsg.includes("Failed to fetch")) {
        errorMsg = "网络连接失败，请检查网络或稍后重试";
      }
      setCloudStatus((s) => ({
        ...s,
        [platform]: { status: "error", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 备份失败：${errorMsg}` },
      }));
      return false;
    } finally {
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, [platform]: { status: "idle", message: "" } }));
      }, 5000);
    }
  };

  // 通用恢复函数
  const doRestore = async (platform: CloudPlatform) => {
    const settings = cloudSettings[platform];
    if (!settings.token || !settings.repo) {
      setCloudStatus((s) => ({
        ...s,
        [platform]: { status: "error", message: platform === "gitee" ? "请先填写 Gitee 私人令牌和仓库地址" : "请先填写 GitHub 个人访问令牌和仓库地址" },
      }));
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, [platform]: { status: "idle", message: "" } }));
      }, 5000);
      return;
    }
    saveCloudSettings();
    setCloudStatus((s) => ({
      ...s,
      [platform]: { status: "downloading", message: platform === "gitee" ? "正在从 Gitee 恢复..." : "正在从 GitHub 恢复..." },
    }));
    try {
      const [owner, repoName] = settings.repo.split("/");
      const url = platform === "gitee"
        ? `https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${settings.file}`
        : `https://api.github.com/repos/${owner}/${repoName}/contents/${settings.file}`;
      const res = await fetch(url, {
        headers: {
          Authorization: platform === "gitee" ? `token ${settings.token}` : `token ${settings.token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.content) {
        const content = decodeURIComponent(escape(atob(data.content)));
        const bundle = JSON.parse(content);
        const result = importFromBundle(bundle, false);
        setCloudStatus((s) => ({
          ...s,
          [platform]: { status: result.ok ? "success" : "error", message: result.message },
        }));
        if (result.ok) {
          setImportResult(result);
        }
      } else {
        setCloudStatus((s) => ({
          ...s,
          [platform]: { status: "error", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 恢复失败：${data.message || "文件不存在"}` },
        }));
      }
    } catch (err) {
      setCloudStatus((s) => ({
        ...s,
        [platform]: { status: "error", message: `${platform === "gitee" ? "Gitee" : "GitHub"} 恢复失败：${err instanceof Error ? err.message : String(err)}` },
      }));
    } finally {
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, [platform]: { status: "idle", message: "" } }));
      }, 5000);
    }
  };

  // 一键同步双平台
  const handleSyncBoth = async () => {
    const giteeReady = cloudSettings.gitee.token && cloudSettings.gitee.repo;
    const githubReady = cloudSettings.github.token && cloudSettings.github.repo;
    if (!giteeReady && !githubReady) {
      setCloudStatus((s) => ({
        ...s,
        gitee: { status: "error", message: "请至少配置一个平台" },
      }));
      setTimeout(() => {
        setCloudStatus((s) => ({ ...s, gitee: { status: "idle", message: "" } }));
      }, 5000);
      return;
    }
    if (giteeReady) await doBackup("gitee");
    if (githubReady) {
      const giteeDone = cloudSettings.gitee.token && cloudSettings.gitee.repo;
      if (giteeDone) await new Promise((r) => setTimeout(r, 500));
      await doBackup("github");
    }
  };

  // 备份到 Gitee
  const handleGiteeBackup = async () => {
    await doBackup("gitee");
  };

  // 从 Gitee 恢复
  const handleGiteeRestore = async () => {
    await doRestore("gitee");
  };

  // 备份到 GitHub
  const handleGithubBackup = async () => {
    await doBackup("github");
  };

  // 从 GitHub 恢复
  const handleGithubRestore = async () => {
    await doRestore("github");
  };

  // 统计：各模块数据条目数
  const stats = useMemo(
    () => [
      { label: "待办任务", count: tasks.length, hint: "tasks" },
      { label: "项目", count: projects.length, hint: "projects" },
      {
        label: "雅思计划",
        count: ieltsPlans.length,
        hint: "ieltsPlan",
      },
      {
        label: "雅思打卡",
        count: ieltsCheckins.length,
        hint: "ieltsCheckin",
      },
      {
        label: "雅思错题",
        count: ieltsErrors.length,
        hint: "ieltsErrors",
      },
      { label: "雅思模考", count: ieltsMocks.length, hint: "ieltsMock" },
      { label: "自媒体内容", count: content.length, hint: "content" },
      { label: "个人积累", count: culture.length, hint: "culture" },
    ],
    [
      tasks,
      projects,
      ieltsPlans,
      ieltsCheckins,
      ieltsErrors,
      ieltsMocks,
      content,
      culture,
    ]
  );

  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  // 取出某个模块的数据用于 CSV 导出
  const getModuleRows = (mod: CsvModule): Record<string, unknown>[] => {
    switch (mod) {
      case "tasks":
        return tasks as unknown as Record<string, unknown>[];
      case "projects":
        return projects as unknown as Record<string, unknown>[];
      case "ieltsPlan":
        return ieltsPlans as unknown as Record<string, unknown>[];
      case "ieltsCheckin":
        return ieltsCheckins as unknown as Record<string, unknown>[];
      case "ieltsErrors":
        return ieltsErrors as unknown as Record<string, unknown>[];
      case "ieltsMock":
        return ieltsMocks as unknown as Record<string, unknown>[];
      case "content":
        return content as unknown as Record<string, unknown>[];
      case "culture":
        return culture as unknown as Record<string, unknown>[];
    }
  };

  // 导出全部 JSON
  const handleExportAll = () => {
    const bundle = buildExportBundle();
    downloadJSON(`personal-workbench-backup-${dateStamp()}.json`, bundle);
  };

  // 导出当前选中模块的 CSV
  const handleExportCsv = () => {
    const rows = getModuleRows(csvModule);
    const label =
      CSV_MODULE_OPTIONS.find((o) => o.value === csvModule)?.label ?? "data";
    downloadCSV(`${label}-${dateStamp()}.csv`, rows);
  };

  // 文件选择 → 读取 → 弹出覆盖/合并确认
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空 input，便于下次选同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    try {
      const bundle = await readJSONFile(file);
      setPendingBundle(bundle);
      setImportChooseOpen(true);
    } catch (err) {
      setImportResult({
        ok: false,
        message: `读取文件失败：${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  // 执行导入
  const doImport = (replace: boolean) => {
    if (pendingBundle === null) return;
    const result = importFromBundle(pendingBundle, replace);
    setImportResult(result);
    setImportChooseOpen(false);
    setPendingBundle(null);
  };

  // 清空所有数据（不包含工具/主题设置）
  const doClearAll = () => {
    useTaskStore.getState().importTasks([], true);
    useProjectStore.getState().importProjects([], true);
    useIELTSStore.getState().importAll({
      plans: [],
      checkins: [],
      errors: [],
      mocks: [],
    });
    useContentStore.getState().importItems([], true);
    useCultureStore.getState().importItems([], true);
    setImportResult({
      ok: true,
      message: "已清空所有业务数据（工具配置与主题设置不受影响）。",
    });
    setClearOpen(false);
    setClearText("");
  };

  // 导入结果统计文本
  const importCountsText = (r: ImportResult): string => {
    if (!r.counts) return "";
    const parts: string[] = [];
    const entries: [string, number | undefined][] = [
      ["待办", r.counts.tasks],
      ["项目", r.counts.projects],
      ["雅思计划", r.counts.ieltsPlan],
      ["雅思打卡", r.counts.ieltsCheckin],
      ["雅思错题", r.counts.ieltsErrors],
      ["雅思模考", r.counts.ieltsMock],
      ["自媒体", r.counts.content],
      ["积累", r.counts.culture],
      ["工具", r.counts.tools],
    ];
    entries.forEach(([label, n]) => {
      if (typeof n === "number") parts.push(`${label} ${n}`);
    });
    return parts.length ? `条目：${parts.join(" · ")}` : "";
  };

  return (
    <div className="space-y-4">
      {/* 数据统计 */}
      <Card>
        <CardHeader
          title="数据概览"
          subtitle={`共 ${totalCount} 条业务数据`}
        />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.hint}
                className="rounded-md border border-default bg-elevated px-3 py-2.5"
              >
                <div className="text-2xs text-muted uppercase tracking-wider">
                  {s.label}
                </div>
                <div className="font-mono text-lg font-semibold text-primary tabular-nums mt-0.5">
                  {s.count}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 导入导出 */}
      <Card>
        <CardHeader
          title="导入与导出"
          subtitle="支持全量 JSON 备份与单模块 CSV 导出"
        />
        <CardBody className="space-y-4">
          {/* 导出全部 JSON */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary font-medium">导出全部数据</div>
              <div className="text-2xs text-tertiary mt-0.5">
                生成包含所有模块的 JSON 备份文件
              </div>
            </div>
            <Button variant="primary" size="md" onClick={handleExportAll}>
              <Download size={14} /> 导出全部 JSON
            </Button>
          </div>

          <div className="h-px bg-[var(--border-default)]" />

          {/* 导出当前模块 CSV */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary font-medium">
                导出模块 CSV
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                选择模块，导出该模块数据为 CSV 表格
              </div>
            </div>
            <Select
              value={csvModule}
              onChange={(e) => setCsvModule(e.target.value as CsvModule)}
              className="w-auto min-w-[140px]"
            >
              {CSV_MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="md" onClick={handleExportCsv}>
              <FileText size={14} /> 导出 CSV
            </Button>
          </div>

          <div className="h-px bg-[var(--border-default)]" />

          {/* 导入 JSON */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary font-medium">
                导入 JSON 备份
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                选择此前导出的 JSON 文件，可选择覆盖或合并
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> 选择文件导入
            </Button>
          </div>

          {/* 导入结果展示 */}
          {importResult && (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-md border px-3 py-2.5",
                importResult.ok
                  ? "border-default bg-elevated"
                  : "border-danger/40 bg-danger/5"
              )}
            >
              {importResult.ok ? (
                <CheckCircle2
                  size={16}
                  className="text-neutral-600 dark:text-neutral-300 shrink-0 mt-0.5"
                />
              ) : (
                <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-primary font-medium">
                  {importResult.message}
                </div>
                {importResult.ok && importCountsText(importResult) && (
                  <div className="text-2xs text-tertiary mt-0.5">
                    {importCountsText(importResult)}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportResult(null)}
              >
                关闭
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 云端备份（双平台） */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <CloudUpload size={14} className="text-brand" />
              云端备份（Gitee / GitHub）
            </span>
          }
          subtitle="将数据备份到代码托管平台，跨设备同步。国内推荐 Gitee，国外推荐 GitHub"
        />
        <CardBody className="space-y-4">
          {/* Gitee 设置 */}
          <div className="rounded-md border border-default bg-elevated overflow-hidden">
            <button
              type="button"
              onClick={() => setGiteeExpanded(!giteeExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings size={12} />
                Gitee 设置
                {cloudSettings.gitee.token && cloudSettings.gitee.repo && (
                  <Badge tone="neutral">已配置</Badge>
                )}
              </span>
              {giteeExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {giteeExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-default">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="text-xs text-secondary block mb-1">
                      私人令牌
                    </label>
                    <div className="relative">
                      <Input
                        type={showTokens ? "text" : "password"}
                        value={cloudSettings.gitee.token}
                        onChange={(e) =>
                          setCloudSettings((s) => ({
                            ...s,
                            gitee: { ...s.gitee, token: e.target.value },
                          }))
                        }
                        placeholder="gitee_private_token"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokens(!showTokens)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                        title={showTokens ? "隐藏令牌" : "显示令牌"}
                      >
                        {showTokens ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="text-2xs text-tertiary mt-1">
                      生成令牌时必须勾选 <span className="text-primary font-medium">projects</span> 权限
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-secondary block mb-1">
                      仓库地址
                    </label>
                    <Input
                      value={cloudSettings.gitee.repo}
                      onChange={(e) =>
                        setCloudSettings((s) => ({
                          ...s,
                          gitee: { ...s.gitee, repo: e.target.value },
                        }))
                      }
                      placeholder="username/repo-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">
                    备份文件名
                  </label>
                  <Input
                    value={cloudSettings.gitee.file}
                    onChange={(e) =>
                      setCloudSettings((s) => ({
                        ...s,
                        gitee: { ...s.gitee, file: e.target.value },
                      }))
                    }
                    placeholder="backup.json"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={saveCloudSettings}
                  >
                    保存设置
                  </Button>
                  {saveFeedback === "saved" && (
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      已保存
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GitHub 设置 */}
          <div className="rounded-md border border-default bg-elevated overflow-hidden">
            <button
              type="button"
              onClick={() => setGithubExpanded(!githubExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings size={12} />
                GitHub 设置
                {cloudSettings.github.token && cloudSettings.github.repo && (
                  <Badge tone="neutral">已配置</Badge>
                )}
              </span>
              {githubExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {githubExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-default">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="text-xs text-secondary block mb-1">
                      个人访问令牌
                    </label>
                    <div className="relative">
                      <Input
                        type={showTokens ? "text" : "password"}
                        value={cloudSettings.github.token}
                        onChange={(e) =>
                          setCloudSettings((s) => ({
                            ...s,
                            github: { ...s.github, token: e.target.value },
                          }))
                        }
                        placeholder="github_personal_access_token"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokens(!showTokens)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                        title={showTokens ? "隐藏令牌" : "显示令牌"}
                      >
                        {showTokens ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-secondary block mb-1">
                      仓库地址
                    </label>
                    <Input
                      value={cloudSettings.github.repo}
                      onChange={(e) =>
                        setCloudSettings((s) => ({
                          ...s,
                          github: { ...s.github, repo: e.target.value },
                        }))
                      }
                      placeholder="username/repo-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">
                    备份文件名
                  </label>
                  <Input
                    value={cloudSettings.github.file}
                    onChange={(e) =>
                      setCloudSettings((s) => ({
                        ...s,
                        github: { ...s.github, file: e.target.value },
                      }))
                    }
                    placeholder="backup.json"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={saveCloudSettings}
                  >
                    保存设置
                  </Button>
                  {saveFeedback === "saved" && (
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      已保存
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary font-medium">
                一键备份 / 恢复
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                已配置：
                {cloudSettings.gitee.token && cloudSettings.gitee.repo && (
                  <span className="text-brand">Gitee</span>
                )}
                {cloudSettings.gitee.token && cloudSettings.gitee.repo && cloudSettings.github.token && cloudSettings.github.repo && (
                  <span className="text-muted"> · </span>
                )}
                {cloudSettings.github.token && cloudSettings.github.repo && (
                  <span className="text-brand">GitHub</span>
                )}
                {!cloudSettings.gitee.token && !cloudSettings.github.token && (
                  <span className="text-muted">请先配置平台</span>
                )}
              </div>
            </div>
            <Button
              variant="blue"
              size="md"
              onClick={handleSyncBoth}
              disabled={
                (!cloudSettings.gitee.token || !cloudSettings.gitee.repo) &&
                (!cloudSettings.github.token || !cloudSettings.github.repo)
              }
            >
              <CloudUpload size={14} /> 一键同步双平台
            </Button>
          </div>

          {/* 单独操作 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Gitee */}
            <div className="rounded-md border border-default bg-elevated px-3 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-primary">Gitee</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGiteeBackup}
                  disabled={
                    !cloudSettings.gitee.token ||
                    !cloudSettings.gitee.repo ||
                    cloudStatus.gitee.status === "uploading" ||
                    cloudStatus.gitee.status === "downloading"
                  }
                >
                  <CloudUpload size={12} /> 备份
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGiteeRestore}
                  disabled={
                    !cloudSettings.gitee.token ||
                    !cloudSettings.gitee.repo ||
                    cloudStatus.gitee.status === "uploading" ||
                    cloudStatus.gitee.status === "downloading"
                  }
                >
                  <CloudDownload size={12} /> 恢复
                </Button>
              </div>
              {cloudStatus.gitee.status !== "idle" && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 mt-2 rounded-md px-2 py-1.5 text-xs",
                    cloudStatus.gitee.status === "success"
                      ? "bg-elevated"
                      : cloudStatus.gitee.status === "error"
                      ? "bg-danger/5 text-danger"
                      : "bg-brand-soft"
                  )}
                >
                  {cloudStatus.gitee.status === "uploading" ||
                  cloudStatus.gitee.status === "downloading" ? (
                    <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  ) : cloudStatus.gitee.status === "success" ? (
                    <CheckCircle2 size={12} className="text-neutral-600 dark:text-neutral-300" />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                  {cloudStatus.gitee.message}
                </div>
              )}
            </div>

            {/* GitHub */}
            <div className="rounded-md border border-default bg-elevated px-3 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-neutral-900" />
                <span className="text-sm font-medium text-primary">GitHub</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGithubBackup}
                  disabled={
                    !cloudSettings.github.token ||
                    !cloudSettings.github.repo ||
                    cloudStatus.github.status === "uploading" ||
                    cloudStatus.github.status === "downloading"
                  }
                >
                  <CloudUpload size={12} /> 备份
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGithubRestore}
                  disabled={
                    !cloudSettings.github.token ||
                    !cloudSettings.github.repo ||
                    cloudStatus.github.status === "uploading" ||
                    cloudStatus.github.status === "downloading"
                  }
                >
                  <CloudDownload size={12} /> 恢复
                </Button>
              </div>
              {cloudStatus.github.status !== "idle" && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 mt-2 rounded-md px-2 py-1.5 text-xs",
                    cloudStatus.github.status === "success"
                      ? "bg-elevated"
                      : cloudStatus.github.status === "error"
                      ? "bg-danger/5 text-danger"
                      : "bg-brand-soft"
                  )}
                >
                  {cloudStatus.github.status === "uploading" ||
                  cloudStatus.github.status === "downloading" ? (
                    <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  ) : cloudStatus.github.status === "success" ? (
                    <CheckCircle2 size={12} className="text-neutral-600 dark:text-neutral-300" />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                  {cloudStatus.github.message}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 危险区 */}
      <Card className="border-danger/30">
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Trash2 size={14} className="text-danger" />
              危险操作
            </span>
          }
          subtitle="清空数据不可恢复，请谨慎操作"
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-primary font-medium">
                清空所有业务数据
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                清空待办、项目、雅思、自媒体、积累等数据；工具配置与主题不受影响。
              </div>
            </div>
            <Button
              variant="danger"
              size="md"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 size={14} /> 清空所有数据
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 导入覆盖/合并选择 */}
      <Modal
        open={importChooseOpen}
        onClose={() => {
          setImportChooseOpen(false);
          setPendingBundle(null);
        }}
        title="选择导入方式"
        size="sm"
        description="文件已读取，请选择如何处理数据。"
      >
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => doImport(true)}
            className="w-full text-left rounded-md border border-default bg-elevated hover:bg-hover px-3 py-2.5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database size={14} className="text-secondary" />
              <span className="text-sm font-medium text-primary">
                覆盖现有数据
              </span>
              <Badge tone="danger" className="ml-auto">
                危险
              </Badge>
            </div>
            <div className="text-2xs text-tertiary mt-1">
              用备份文件替换当前所有数据，原数据将丢失。
            </div>
          </button>
          <button
            type="button"
            onClick={() => doImport(false)}
            className="w-full text-left rounded-md border border-default bg-elevated hover:bg-hover px-3 py-2.5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Database size={14} className="text-secondary" />
              <span className="text-sm font-medium text-primary">
                合并到现有数据
              </span>
              <Badge tone="neutral" className="ml-auto">
                推荐
              </Badge>
            </div>
            <div className="text-2xs text-tertiary mt-1">
              将备份文件追加到当前数据前面（同 id 数据可能重复）。
            </div>
          </button>
        </div>
      </Modal>

      {/* 清空二次确认：需输入「确认」 */}
      <ConfirmDialog
        open={clearOpen}
        title="清空所有数据"
        destructive
        confirmText="执行清空"
        onConfirm={() => {
          if (clearText.trim() === "确认") {
            doClearAll();
          }
        }}
        onCancel={() => {
          setClearOpen(false);
          setClearText("");
        }}
        message={
          <div className="space-y-3">
            <p>
              此操作将永久清空所有业务数据（待办、项目、雅思、自媒体、积累），
              <span className="text-danger font-medium">不可恢复</span>。
            </p>
            <p className="text-2xs text-muted">
              建议先「导出全部 JSON」备份。
            </p>
            <div>
              <label className="text-xs text-secondary">
                请输入「确认」以继续：
              </label>
              <Input
                value={clearText}
                onChange={(e) => setClearText(e.target.value)}
                placeholder="确认"
                className="mt-1"
                autoFocus
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
