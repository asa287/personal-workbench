import { useEffect, useState, type ReactNode } from "react";
import { Film, Tv, Star, Library } from "lucide-react";
import type { CultureItem, CultureType, CultureStatus } from "@/types";
import { CULTURE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

// 状态 Badge 色调：与 CultureList 保持一致，仅用中性 / 银色 / 描边
const STATUS_TONE: Record<
  CultureStatus,
  "neutral" | "silver" | "outline"
> = {
  wishlist: "outline",
  reading: "silver",
  done: "neutral",
  abandoned: "outline",
};

/**
 * 海报图片：加载远程 URL，失败或无 src 时回退到 fallback。
 * 网格卡片与详情页大图共用。
 */
export function PosterImage({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [error, setError] = useState(false);
  // src 变化时重置错误态，便于切换条目后重新尝试加载
  useEffect(() => {
    setError(false);
  }, [src]);
  if (!src || error) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setError(true)}
    />
  );
}

// 海报占位：按类型选择图标，灰色底居中
function PosterFallback({
  type,
  className,
}: {
  type: CultureType;
  className?: string;
}) {
  const Icon = type === "tv" ? Tv : Film;
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-elevated text-muted",
        className
      )}
    >
      <Icon size={28} />
    </div>
  );
}

function GridCard({
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
      title={item.title}
      className={cn(
        "group text-left rounded-md border bg-surface overflow-hidden transition-all",
        selected
          ? "border-brand-border ring-2 ring-brand"
          : "border-default hover:border-strong hover:shadow-float"
      )}
    >
      {/* 海报区：固定 2/3 比例 */}
      <div className="relative aspect-[2/3] bg-elevated overflow-hidden">
        <PosterImage
          src={item.posterUrl}
          alt={item.title}
          className="w-full h-full object-cover"
          fallback={<PosterFallback type={item.type} className="w-full h-full" />}
        />
        {/* 状态 Badge 叠在海报左上角 */}
        <div className="absolute top-1.5 left-1.5">
          <Badge
            tone={STATUS_TONE[item.status]}
            className={cn(
              "backdrop-blur-sm",
              item.status === "abandoned" && "opacity-60"
            )}
          >
            {CULTURE_STATUS_LABELS[item.status]}
          </Badge>
        </div>
      </div>
      {/* 文案区：标题 / 创作者 / 评分 */}
      <div className="p-2 space-y-0.5">
        <p
          className={cn(
            "text-sm truncate",
            item.status === "abandoned" ? "text-muted line-through" : "text-primary"
          )}
        >
          {item.title}
        </p>
        {item.creator && (
          <p className="text-2xs text-muted truncate">{item.creator}</p>
        )}
        <div className="flex items-center gap-1 text-2xs text-secondary">
          <Star
            size={11}
            className={cn(
              item.rating > 0
                ? "text-silver-500 fill-current"
                : "text-neutral-300 dark:text-neutral-700"
            )}
          />
          <span className="font-mono tabular-nums">
            {item.rating > 0 ? item.rating : "—"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function CultureGrid({
  items,
  onSelect,
  selectedId,
}: {
  items: CultureItem[];
  onSelect: (item: CultureItem) => void;
  selectedId?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Library size={20} />}
        title="暂无影片"
        description="在该类型下新建条目并补充海报链接，或切换其他类型。"
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <GridCard
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => onSelect(item)}
        />
      ))}
    </div>
  );
}
