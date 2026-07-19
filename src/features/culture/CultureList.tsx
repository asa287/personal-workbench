import type { ReactNode } from "react";
import { Book, Film, Tv, Podcast, FileText, Package } from "lucide-react";
import type { CultureType, CultureItem, CultureStatus } from "@/types";
import { CULTURE_TYPE_LABELS, CULTURE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Rating } from "./CultureForm";
import { PosterImage } from "./CultureGrid";
import { fmtDate } from "@/lib/date";
import { cn } from "@/lib/cn";

// 类型图标（单色，符合黑白灰规范）
const TYPE_ICON: Record<CultureType, ReactNode> = {
  book: <Book size={14} />,
  movie: <Film size={14} />,
  tv: <Tv size={14} />,
  podcast: <Podcast size={14} />,
  article: <FileText size={14} />,
  other: <Package size={14} />,
};

// 类型分组顺序
const TYPE_ORDER: CultureType[] = [
  "book",
  "movie",
  "tv",
  "podcast",
  "article",
  "other",
];

// 状态 Badge 色调（仅用中性/银色/描边，避免引入蓝紫绿）
const STATUS_TONE: Record<
  CultureStatus,
  "neutral" | "silver" | "outline"
> = {
  wishlist: "outline",
  reading: "silver",
  done: "neutral",
  abandoned: "outline",
};

export function CultureList({
  items,
  onSelect,
  selectedId,
}: {
  items: CultureItem[];
  onSelect: (item: CultureItem) => void;
  selectedId?: string;
}) {
  // 按类型分组
  const groups = TYPE_ORDER.map((type) => ({
    type,
    label: CULTURE_TYPE_LABELS[type],
    items: items.filter((i) => i.type === type),
  })).filter((g) => g.items.length > 0);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package size={20} />}
        title="暂无积累"
        description="点击右上角新建，或调整筛选条件。"
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.type}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-muted">{TYPE_ICON[g.type]}</span>
            <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
              {g.label}
            </h3>
            <span className="text-2xs text-muted">{g.items.length}</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>
          <div className="space-y-1">
            {g.items.map((item) => (
              <CultureRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={() => onSelect(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CultureRow({
  item,
  selected,
  onSelect,
}: {
  item: CultureItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors",
        selected
          ? "border-strong bg-hover"
          : "border-default bg-surface hover:bg-hover"
      )}
    >
      {item.posterUrl && (
        <PosterImage
          src={item.posterUrl}
          alt={item.title}
          className="shrink-0 w-8 h-12 object-cover rounded-sm border border-default bg-elevated"
          fallback={
            <div className="shrink-0 w-8 h-12 rounded-sm border border-default bg-elevated" />
          }
        />
      )}
      <span
        className={cn("shrink-0", selected ? "text-primary" : "text-muted")}
      >
        {TYPE_ICON[item.type]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm truncate",
              item.status === "abandoned" && "text-muted line-through"
            )}
          >
            {item.title}
          </span>
          {item.creator && (
            <span className="text-2xs text-muted truncate hidden sm:inline">
              {item.creator}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-2xs text-muted">
          <Badge
            tone={STATUS_TONE[item.status]}
            className={cn(item.status === "abandoned" && "opacity-60")}
          >
            {CULTURE_STATUS_LABELS[item.status]}
          </Badge>
          {item.reusableMaterial && (
            <span className="text-2xs text-silver-700 dark:text-silver-300">
              素材
            </span>
          )}
          <span>·</span>
          <span>{fmtDate(item.updatedAt)}</span>
        </div>
      </div>
      <div className="shrink-0">
        <Rating value={item.rating} />
      </div>
    </button>
  );
}
