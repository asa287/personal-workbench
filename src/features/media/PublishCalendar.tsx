import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addMonths,
  parseISO,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useContentStore } from "@/stores/useContentStore";
import { Button } from "@/components/ui/Button";
import { PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { ContentItem, ISODateTime, MediaPlatform } from "@/types";
import { ContentForm } from "./ContentForm";

// 周一为一周开始
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function PublishCalendar({
  platform = "all",
}: {
  // 平台筛选：all 表示全部
  platform?: MediaPlatform | "all";
} = {}) {
  const items = useContentStore((s) => s.items);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [presetDate, setPresetDate] = useState<ISODateTime | undefined>(undefined);

  // 当月日历网格：从本月首日所在周的周一开始，到本月末日所在周的周日结束
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // 仅展示已发布 / 已排期，再按平台筛选
  const calendarItems = useMemo(
    () =>
      items
        .filter((i) => i.status === "published" || i.status === "scheduled")
        .filter((i) => platform === "all" || i.platform === platform),
    [items, platform]
  );

  // 按日期分组
  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const it of calendarItems) {
      if (!it.publishDate) continue;
      try {
        const d = parseISO(it.publishDate);
        const key = format(d, "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(it);
        map.set(key, arr);
      } catch {
        // ignore invalid date
      }
    }
    return map;
  }, [calendarItems]);

  // 点击日期格：预填该日 10:00 并打开新建表单
  const openNewOnDate = (date: Date) => {
    const dt = new Date(date);
    dt.setHours(10, 0, 0, 0);
    setPresetDate(dt.toISOString());
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary">
          {format(cursor, "yyyy 年 MM 月", { locale: zhCN })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, -1))}
            title="上一月"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            今天
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, 1))}
            title="下一月"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <div className="surface-card rounded-lg overflow-hidden">
        {/* 星期表头 */}
        <div className="grid grid-cols-7 border-b border-default">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-2xs font-medium text-tertiary uppercase border-r border-default last:border-r-0"
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日期网格：固定 7 列 */}
        <div className="grid grid-cols-7">
          {days.map((d, idx) => {
            const inMonth = isSameMonth(d, cursor);
            const today = isToday(d);
            const key = format(d, "yyyy-MM-dd");
            const dayItems = itemsByDay.get(key) ?? [];
            const isLastCol = (idx + 1) % 7 === 0;
            const isLastRow = idx >= days.length - 7;
            return (
              <div
                key={idx}
                onClick={() => openNewOnDate(d)}
                className={cn(
                  "group min-h-[96px] p-1.5 border-r border-b border-default relative cursor-pointer hover:bg-hover/50 transition-colors",
                  isLastCol && "border-r-0",
                  isLastRow && "border-b-0",
                  !inMonth && "bg-elevated/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-2xs font-medium tabular-nums inline-flex items-center justify-center",
                      today
                        ? "w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : inMonth
                          ? "text-secondary"
                          : "text-muted"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <Plus
                    size={12}
                    className="text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="space-y-1">
                  {dayItems.map((it) => (
                    <CalendarItemBadge key={it.id} item={it} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-3 flex items-center gap-3 text-2xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-neutral-200/70 dark:bg-neutral-700" />
          已发布
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border border-default bg-surface" />
          已排期
        </span>
        <span className="ml-auto">点击日期格可新建内容</span>
      </div>

      <ContentForm
        open={formOpen}
        item={null}
        preset={
          presetDate ? { publishDate: presetDate, status: "scheduled" } : undefined
        }
        onClose={() => {
          setFormOpen(false);
          setPresetDate(undefined);
        }}
      />
    </div>
  );
}

// 单元格内条目：已发布实心 / 已排期 outline
function CalendarItemBadge({ item }: { item: ContentItem }) {
  const isPublished = item.status === "published";
  const title = item.title.length > 12 ? item.title.slice(0, 12) + "…" : item.title;
  return (
    <div
      title={`${item.title} · ${PLATFORM_LABELS[item.platform]}`}
      className={cn(
        "px-1.5 py-0.5 rounded text-2xs truncate flex items-center",
        isPublished
          ? "bg-neutral-200/70 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100"
          : "border border-default text-secondary bg-surface"
      )}
    >
      <span className="truncate">{title}</span>
    </div>
  );
}
