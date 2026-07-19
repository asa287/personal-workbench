import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { AIAssistButton } from "@/components/shared/AIAssistButton";
import { isThisMonthISO } from "@/lib/date";
import type { MediaPlatform } from "@/types";
import { TopicLibrary } from "./TopicLibrary";
import { PublishCalendar } from "./PublishCalendar";
import { MaterialManager } from "./MaterialManager";
import { ReviewTab } from "./ReviewTab";
import { ContentForm } from "./ContentForm";

type Tab = "topics" | "calendar" | "materials" | "review";

// 平台筛选值：all 表示全部
type PlatformFilter = MediaPlatform | "all";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "topics", label: "选题库" },
  { value: "calendar", label: "发布日历" },
  { value: "materials", label: "素材管理" },
  { value: "review", label: "数据复盘" },
];

// URL ?tab=value 映射
const TAB_FROM_URL: Record<string, Tab> = {
  topics: "topics",
  calendar: "calendar",
  materials: "materials",
  review: "review",
};

// 平台标签选项
const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "douyin", label: "抖音" },
  { value: "other", label: "其他" },
];

// URL ?platform=value 映射
const PLATFORM_FROM_URL: Record<string, PlatformFilter> = {
  all: "all",
  xiaohongshu: "xiaohongshu",
  douyin: "douyin",
  other: "other",
};

// 从 AI 输出（Markdown）中解析出选题标题与方向摘要
function parseAIIdea(text: string): { title: string; direction: string } {
  const lines = text.split("\n");
  const headingIdx = lines.findIndex((l) => /^##\s/.test(l));
  if (headingIdx === -1) {
    const firstLine = lines.find((l) => l.trim() && !l.startsWith("#"));
    return {
      title: (firstLine ?? "AI 选题").slice(0, 80),
      direction: text.slice(0, 200),
    };
  }
  const heading = lines[headingIdx].replace(/^##\s*/, "");
  // "选题 1：xxx — yyy" -> "xxx"
  const afterColon = heading.includes("：")
    ? heading.split("：").slice(1).join("：")
    : heading;
  const title = afterColon.split(" — ")[0].trim().slice(0, 80) || "AI 选题";
  const body = lines.slice(headingIdx + 1).join("\n").trim();
  return { title, direction: body.slice(0, 300) };
}

export default function MediaPage() {
  const items = useContentStore((s) => s.items);
  const addItem = useContentStore((s) => s.addItem);
  const culture = useCultureStore((s) => s.items);

  const [params, setParams] = useSearchParams();
  // 单一数据源：tab / platform 直接从 URL 派生
  const tab: Tab = TAB_FROM_URL[params.get("tab") ?? ""] ?? "topics";
  const platform: PlatformFilter =
    PLATFORM_FROM_URL[params.get("platform") ?? ""] ?? "all";
  const [formOpen, setFormOpen] = useState(false);

  // 处理 ?new=1：打开新建表单并清除该参数
  useEffect(() => {
    if (params.get("new") === "1") {
      setFormOpen(true);
      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  const switchTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === "topics") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  };

  const switchPlatform = (next: PlatformFilter) => {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("platform");
    else p.set("platform", next);
    setParams(p, { replace: true });
  };

  const openNew = () => setFormOpen(true);

  // AI 采纳：解析后创建 idea 状态的 ContentItem；平台跟随当前筛选（all 时回退小红书）
  const onAdoptAI = (text: string) => {
    const { title, direction } = parseAIIdea(text);
    addItem({
      platform: platform === "all" ? "xiaohongshu" : platform,
      title,
      direction,
      tags: [],
      referenceLinks: [],
      materialIds: [],
      status: "idea",
      views: 0,
      likes: 0,
      collects: 0,
      comments: 0,
    });
  };

  // 顶部状态：本月发布数 + 平均互动（浏览 / 点赞 / 收藏 / 评论），按平台筛选
  const stats = useMemo(() => {
    const scoped =
      platform === "all"
        ? items
        : items.filter((i) => i.platform === platform);
    const publishedThisMonth = scoped.filter(
      (i) => i.status === "published" && isThisMonthISO(i.publishDate)
    );
    const count = publishedThisMonth.length;
    const sum = publishedThisMonth.reduce(
      (acc, it) => ({
        views: acc.views + it.views,
        likes: acc.likes + it.likes,
        collects: acc.collects + it.collects,
        comments: acc.comments + it.comments,
      }),
      { views: 0, likes: 0, collects: 0, comments: 0 }
    );
    const avg = count
      ? {
          views: Math.round(sum.views / count),
          likes: Math.round(sum.likes / count),
          collects: Math.round(sum.collects / count),
          comments: Math.round(sum.comments / count),
        }
      : { views: 0, likes: 0, collects: 0, comments: 0 };
    const rate = sum.views
      ? (sum.likes + sum.collects + sum.comments) / sum.views
      : 0;
    return { count, ...avg, rate };
  }, [items, platform]);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* 顶部状态卡 */}
      <div className="mb-5 surface-card rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xs text-muted uppercase tracking-wider">
              本月发布
            </div>
            <div className="text-2xl font-semibold text-primary tabular-nums mt-0.5">
              {stats.count}
              <span className="text-sm text-tertiary ml-1">条</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xs text-muted uppercase tracking-wider">
              平均互动率
            </div>
            <div className="text-lg font-semibold text-primary tabular-nums mt-0.5">
              {(stats.rate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 pt-3 border-t border-default">
          <StatCell label="平均浏览" value={stats.views} />
          <StatCell label="平均点赞" value={stats.likes} />
          <StatCell label="平均收藏" value={stats.collects} />
          <StatCell label="平均评论" value={stats.comments} />
        </div>
      </div>

      {/* 平台标签切换 */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xs text-muted uppercase tracking-wider">平台</span>
        <Segmented
          value={platform}
          onChange={switchPlatform}
          options={PLATFORM_OPTIONS}
          size="sm"
        />
      </div>

      {/* Tab 切换 + 操作按钮 */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Segmented value={tab} onChange={switchTab} options={TAB_OPTIONS} />
        <div className="flex items-center gap-2">
          <AIAssistButton
            type="content-idea"
            ctx={{ culture }}
            label="AI 选题"
            onAdopt={onAdoptAI}
            size="md"
          />
          <Button variant="primary" size="md" onClick={openNew}>
            <Plus size={14} /> 新建选题
          </Button>
        </div>
      </div>

      {/* 当前 Tab 内容 */}
      {tab === "topics" && <TopicLibrary onOpenNew={openNew} platform={platform} />}
      {tab === "calendar" && <PublishCalendar platform={platform} />}
      {tab === "materials" && <MaterialManager platform={platform} />}
      {tab === "review" && <ReviewTab platform={platform} />}

      {/* 新建选题表单（父组件管理新建，子组件各自管理编辑） */}
      <ContentForm
        open={formOpen}
        item={null}
        preset={platform === "all" ? undefined : { platform }}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xs text-muted">{label}</div>
      <div className="text-sm font-medium text-secondary tabular-nums mt-0.5">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
