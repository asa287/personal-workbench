import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useContentStore } from "@/stores/useContentStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Input";
import { PLATFORM_LABELS } from "@/lib/labels";
import { fmtDate } from "@/lib/date";
import type { ContentItem, MediaPlatform } from "@/types";

// 互动率：(点赞 + 收藏 + 评论) / 浏览
function interactionRate(it: ContentItem): number {
  if (it.views <= 0) return 0;
  return (it.likes + it.collects + it.comments) / it.views;
}

function formatRate(r: number): string {
  return (r * 100).toFixed(1) + "%";
}

// 中性色图表色板（银色 / 中性灰阶，避免蓝紫绿）
const CHART_COLORS = {
  views: "#a1a1aa", // neutral-400
  likes: "#71717a", // neutral-500
  collects: "#52525b", // neutral-600
  comments: "#3f3f46", // neutral-700
};

export function ReviewTab({
  platform = "all",
}: {
  // 平台筛选：all 表示全部
  platform?: MediaPlatform | "all";
} = {}) {
  const items = useContentStore((s) => s.items);
  const updateItem = useContentStore((s) => s.updateItem);

  // 已发布内容，按平台筛选后按发布时间倒序
  const published = useMemo(
    () =>
      items
        .filter((i) => i.status === "published")
        .filter((i) => platform === "all" || i.platform === platform)
        .sort((a, b) =>
          (b.publishDate ?? "").localeCompare(a.publishDate ?? "")
        ),
    [items, platform]
  );

  // 最近 10 条用于图表（按时间正序展示）
  const chartData = useMemo(
    () =>
      [...published]
        .slice(0, 10)
        .reverse()
        .map((it) => ({
          name: it.title.length > 8 ? it.title.slice(0, 8) + "…" : it.title,
          浏览: it.views,
          点赞: it.likes,
          收藏: it.collects,
          评论: it.comments,
        })),
    [published]
  );

  // 平均互动
  const avgStats = useMemo(() => {
    if (published.length === 0)
      return { views: 0, likes: 0, collects: 0, comments: 0, rate: 0 };
    const sum = published.reduce(
      (acc, it) => ({
        views: acc.views + it.views,
        likes: acc.likes + it.likes,
        collects: acc.collects + it.collects,
        comments: acc.comments + it.comments,
      }),
      { views: 0, likes: 0, collects: 0, comments: 0 }
    );
    return {
      views: Math.round(sum.views / published.length),
      likes: Math.round(sum.likes / published.length),
      collects: Math.round(sum.collects / published.length),
      comments: Math.round(sum.comments / published.length),
      rate: sum.views
        ? (sum.likes + sum.collects + sum.comments) / sum.views
        : 0,
    };
  }, [published]);

  if (published.length === 0) {
    return (
      <EmptyState
        title="暂无已发布内容"
        description="在选题库中点击「标记已发布」补全发布数据后，可在此复盘。"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 图表 */}
      <Card>
        <CardHeader
          title="最近 10 条发布互动对比"
          subtitle={`平均互动率 ${formatRate(avgStats.rate)} · 浏览 ${avgStats.views} · 点赞 ${avgStats.likes} · 收藏 ${avgStats.collects} · 评论 ${avgStats.comments}`}
        />
        <CardBody>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-default)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-primary)" }}
                  cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }}
                />
                <Bar dataKey="浏览" fill={CHART_COLORS.views} radius={[3, 3, 0, 0]} />
                <Bar dataKey="点赞" fill={CHART_COLORS.likes} radius={[3, 3, 0, 0]} />
                <Bar dataKey="收藏" fill={CHART_COLORS.collects} radius={[3, 3, 0, 0]} />
                <Bar dataKey="评论" fill={CHART_COLORS.comments} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* 明细表格 */}
      <Card>
        <CardHeader title="已发布内容明细" subtitle={`${published.length} 条`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default text-2xs text-muted uppercase">
                  <th className="text-left font-medium px-3 py-2">标题</th>
                  <th className="text-left font-medium px-3 py-2">平台</th>
                  <th className="text-right font-medium px-3 py-2">发布日期</th>
                  <th className="text-right font-medium px-3 py-2">浏览</th>
                  <th className="text-right font-medium px-3 py-2">点赞</th>
                  <th className="text-right font-medium px-3 py-2">收藏</th>
                  <th className="text-right font-medium px-3 py-2">评论</th>
                  <th className="text-right font-medium px-3 py-2">互动率</th>
                  <th className="text-left font-medium px-3 py-2 min-w-[200px]">
                    复盘结论
                  </th>
                </tr>
              </thead>
              <tbody>
                {published.map((it) => (
                  <ReviewRow
                    key={it.id}
                    item={it}
                    onSave={(review) => updateItem(it.id, { review })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ReviewRow({
  item,
  onSave,
}: {
  item: ContentItem;
  onSave: (review: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.review ?? "");

  const startEdit = () => {
    setVal(item.review ?? "");
    setEditing(true);
  };
  const save = () => {
    onSave(val.trim());
    setEditing(false);
  };

  return (
    <tr className="border-b border-default last:border-b-0 hover:bg-hover/50">
      <td className="px-3 py-2 text-primary max-w-[200px]">
        <div className="truncate">{item.title}</div>
      </td>
      <td className="px-3 py-2">
        <Badge tone="neutral">{PLATFORM_LABELS[item.platform]}</Badge>
      </td>
      <td className="px-3 py-2 text-right text-secondary tabular-nums">
        {fmtDate(item.publishDate)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{item.views}</td>
      <td className="px-3 py-2 text-right tabular-nums">{item.likes}</td>
      <td className="px-3 py-2 text-right tabular-nums">{item.collects}</td>
      <td className="px-3 py-2 text-right tabular-nums">{item.comments}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatRate(interactionRate(item))}
      </td>
      <td className="px-3 py-2 min-w-[200px] align-top">
        {editing ? (
          <div className="space-y-1">
            <Textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              rows={2}
              className="text-xs"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" variant="primary" onClick={save}>
                保存
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="text-left text-xs text-secondary hover:text-primary min-h-[36px] w-full"
          >
            {item.review ? (
              <span className="line-clamp-2">{item.review}</span>
            ) : (
              <span className="text-muted">点击添加复盘…</span>
            )}
          </button>
        )}
      </td>
    </tr>
  );
}
