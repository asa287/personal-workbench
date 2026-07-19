import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { useContentStore } from "@/stores/useContentStore";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PLATFORM_LABELS, CONTENT_STATUS_LABELS } from "@/lib/labels";
import { fmtDate } from "@/lib/date";
import type { ContentItem, ContentStatus, MediaPlatform } from "@/types";
import { ContentForm } from "./ContentForm";

// 选题库展示的状态范围
const VISIBLE_STATUS: ContentStatus[] = ["idea", "drafting", "scheduled"];

export function TopicLibrary({
  onOpenNew,
  platform = "all",
}: {
  // 空状态 CTA：交由父组件打开新建表单
  onOpenNew?: () => void;
  // 平台筛选：all 表示全部
  platform?: MediaPlatform | "all";
}) {
  const items = useContentStore((s) => s.items);
  const deleteItem = useContentStore((s) => s.deleteItem);

  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [publishTarget, setPublishTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // 仅展示 选题 / 草稿中 / 已排期，按状态优先级排序；再按平台筛选
  const topics = useMemo(
    () =>
      items
        .filter((i) => VISIBLE_STATUS.includes(i.status))
        .filter((i) => platform === "all" || i.platform === platform)
        .sort((a, b) => {
          const order: Record<ContentStatus, number> = {
            scheduled: 0,
            drafting: 1,
            idea: 2,
            published: 3,
            archived: 4,
          };
          const oa = order[a.status];
          const ob = order[b.status];
          if (oa !== ob) return oa - ob;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [items, platform]
  );

  const openEdit = (it: ContentItem) => {
    setEditing(it);
    setPublishTarget(null);
    setFormOpen(true);
  };
  const openPublish = (it: ContentItem) => {
    setEditing(it);
    setPublishTarget(it);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary">选题库</h2>
        <span className="text-2xs text-muted">{topics.length} 个进行中</span>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={<Plus size={20} />}
          title="暂无选题"
          description="点击右上角「新建选题」开始你的下一个内容。"
          action={
            onOpenNew ? (
              <Button variant="primary" size="md" onClick={onOpenNew}>
                <Plus size={14} /> 新建选题
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topics.map((it) => (
            <TopicCard
              key={it.id}
              item={it}
              onEdit={() => openEdit(it)}
              onPublish={() => openPublish(it)}
              onDelete={() => setDeleting(it)}
            />
          ))}
        </div>
      )}

      {/* 编辑 / 标记已发布 共用同一表单，preset 区分 */}
      <ContentForm
        open={formOpen}
        item={editing}
        preset={publishTarget ? { status: "published" } : undefined}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setPublishTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除内容"
        message={
          deleting ? `确认删除「${deleting.title}」？此操作不可恢复。` : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteItem(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function TopicCard({
  item,
  onEdit,
  onPublish,
  onDelete,
}: {
  item: ContentItem;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-strong transition-colors">
      <CardBody className="space-y-3">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-medium text-primary flex-1 line-clamp-2">
            {item.title}
          </h3>
          <Badge tone="silver">{PLATFORM_LABELS[item.platform]}</Badge>
        </div>

        {item.direction && (
          <p className="text-xs text-tertiary">方向：{item.direction}</p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-2xs bg-elevated border border-default text-secondary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-2xs text-muted">
          <Badge tone={item.status === "scheduled" ? "outline" : "neutral"}>
            {CONTENT_STATUS_LABELS[item.status]}
          </Badge>
          {item.publishDate && (
            <>
              <span>·</span>
              <span>{fmtDate(item.publishDate)}</span>
            </>
          )}
          <span>·</span>
          <span>创建于 {fmtDate(item.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 pt-1 border-t border-default">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil size={12} /> 编辑
          </Button>
          <Button variant="ghost" size="sm" onClick={onPublish}>
            <Send size={12} /> 标记已发布
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="hover:text-danger"
            title="删除"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
