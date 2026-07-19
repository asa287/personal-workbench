import { useState } from "react";
import { Plus, Pencil, Trash2, Bookmark, Link2, Library } from "lucide-react";
import type { CultureItem, Excerpt, ContentItem } from "@/types";
import { useCultureStore } from "@/stores/useCultureStore";
import { useContentStore } from "@/stores/useContentStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import { Rating } from "./CultureForm";
import { ExcerptEditor } from "./ExcerptEditor";
import { PosterImage } from "./CultureGrid";
import { CULTURE_TYPE_LABELS, CULTURE_STATUS_LABELS } from "@/lib/labels";
import { fmtFullDate } from "@/lib/date";
import { cn } from "@/lib/cn";

export function CultureDetail({
  item,
  onEdit,
}: {
  item: CultureItem;
  onEdit: () => void;
}) {
  const addExcerpt = useCultureStore((s) => s.addExcerpt);
  const deleteExcerpt = useCultureStore((s) => s.deleteExcerpt);
  const toggleExcerptMaterial = useCultureStore((s) => s.toggleExcerptMaterial);
  const updateExcerpt = useCultureStore((s) => s.updateExcerpt);
  const updateItem = useCultureStore((s) => s.updateItem);
  const deleteItem = useCultureStore((s) => s.deleteItem);
  const contentItems = useContentStore((s) => s.items);
  const updateContent = useContentStore((s) => s.updateItem);

  const [newExcerpt, setNewExcerpt] = useState("");
  const [editingExcerpt, setEditingExcerpt] = useState<Excerpt | null>(null);
  const [linkingExcerpt, setLinkingExcerpt] = useState<Excerpt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddExcerpt = () => {
    if (!newExcerpt.trim()) return;
    addExcerpt(item.id, newExcerpt.trim());
    setNewExcerpt("");
  };

  const handleToggleReusable = () => {
    updateItem(item.id, { reusableMaterial: !item.reusableMaterial });
  };

  // 关联摘录到自媒体选题：双向同步 materialIds 与 linkedContentIds
  const handleLinkContent = (contentId: string) => {
    if (!linkingExcerpt) return;
    const c = contentItems.find((x) => x.id === contentId);
    if (c && !c.materialIds.includes(linkingExcerpt.id)) {
      updateContent(contentId, {
        materialIds: [...c.materialIds, linkingExcerpt.id],
      });
    }
    if (!linkingExcerpt.linkedContentIds.includes(contentId)) {
      updateExcerpt(item.id, linkingExcerpt.id, {
        linkedContentIds: [...linkingExcerpt.linkedContentIds, contentId],
      });
    }
  };

  const handleUnlinkContent = (excerpt: Excerpt, contentId: string) => {
    const c = contentItems.find((x) => x.id === contentId);
    if (c) {
      updateContent(contentId, {
        materialIds: c.materialIds.filter((id) => id !== excerpt.id),
      });
    }
    updateExcerpt(item.id, excerpt.id, {
      linkedContentIds: excerpt.linkedContentIds.filter(
        (id) => id !== contentId
      ),
    });
  };

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil size={14} /> 编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleting(true)}
            className="hover:text-danger"
          >
            <Trash2 size={14} /> 删除
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={item.reusableMaterial}
            onChange={handleToggleReusable}
            className="accent-neutral-700 dark:accent-neutral-300"
          />
          <Bookmark size={12} /> 标记为可复用素材
        </label>
      </div>

      {/* 基本信息 */}
      <div className="flex gap-4">
        {item.posterUrl && (
          <PosterImage
            src={item.posterUrl}
            alt={item.title}
            className="w-32 shrink-0 aspect-[2/3] object-cover rounded-md border border-default bg-elevated"
            fallback={
              <div className="w-32 shrink-0 aspect-[2/3] rounded-md border border-default bg-elevated" />
            }
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge tone="silver">{CULTURE_TYPE_LABELS[item.type]}</Badge>
            <Badge tone="outline">{CULTURE_STATUS_LABELS[item.status]}</Badge>
            {item.reusableMaterial && <Badge tone="silver">素材</Badge>}
          </div>
          <h2 className="text-lg font-semibold text-primary">{item.title}</h2>
          {item.creator && (
            <p className="text-sm text-secondary mt-0.5">{item.creator}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-2xs text-muted">
            <span>开始：{fmtFullDate(item.startDate)}</span>
            <span>完成：{fmtFullDate(item.finishDate)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Rating value={item.rating} />
            <span className="text-2xs text-muted">
              {item.rating > 0 ? `${item.rating} / 5` : "未评分"}
            </span>
          </div>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {item.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 个人观点 */}
      {item.opinion && (
        <div>
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-1.5">
            个人观点
          </h4>
          <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
            {item.opinion}
          </p>
        </div>
      )}

      {/* 摘录区 */}
      <div>
        <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">
          摘录 · {item.excerpts.length}
        </h4>
        {/* 添加摘录：输入框 + 回车 */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            value={newExcerpt}
            onChange={(e) => setNewExcerpt(e.target.value)}
            placeholder="新增摘录，回车添加…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddExcerpt();
              }
            }}
          />
          <Button variant="secondary" size="md" onClick={handleAddExcerpt}>
            <Plus size={14} /> 添加
          </Button>
        </div>

        {item.excerpts.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">暂无摘录</p>
        ) : (
          <div className="space-y-2">
            {item.excerpts.map((ex) => (
              <ExcerptCard
                key={ex.id}
                excerpt={ex}
                contentItems={contentItems}
                onToggleMaterial={() => toggleExcerptMaterial(item.id, ex.id)}
                onEdit={() => setEditingExcerpt(ex)}
                onDelete={() => deleteExcerpt(item.id, ex.id)}
                onOpenLink={() => setLinkingExcerpt(ex)}
                onUnlink={(cid) => handleUnlinkContent(ex, cid)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 备注 */}
      {item.note && (
        <div>
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-1.5">
            备注
          </h4>
          <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
            {item.note}
          </p>
        </div>
      )}

      {/* 编辑摘录弹窗（按 id remount 以避免表单状态串台） */}
      <ExcerptEditor
        key={editingExcerpt?.id ?? "none"}
        cultureId={item.id}
        excerpt={editingExcerpt}
        onSave={() => setEditingExcerpt(null)}
      />

      {/* 关联自媒体选题弹窗 */}
      <LinkContentModal
        open={!!linkingExcerpt}
        excerpt={linkingExcerpt}
        contentItems={contentItems}
        onClose={() => setLinkingExcerpt(null)}
        onLink={handleLinkContent}
        onUnlink={(cid) =>
          linkingExcerpt && handleUnlinkContent(linkingExcerpt, cid)
        }
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={deleting}
        title="删除积累"
        message={`确认删除「${item.title}」？此操作不可恢复。`}
        destructive
        confirmText="删除"
        onConfirm={() => {
          deleteItem(item.id);
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}

function ExcerptCard({
  excerpt,
  contentItems,
  onToggleMaterial,
  onEdit,
  onDelete,
  onOpenLink,
  onUnlink,
}: {
  excerpt: Excerpt;
  contentItems: ContentItem[];
  onToggleMaterial: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLink: () => void;
  onUnlink: (contentId: string) => void;
}) {
  const linked = contentItems.filter((c) =>
    excerpt.linkedContentIds.includes(c.id)
  );
  return (
    <div
      className={cn(
        "border border-default rounded-md p-3 bg-surface",
        excerpt.isMaterial && "border-silver-500/40 bg-silver-300/5"
      )}
    >
      <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
        {excerpt.content}
      </p>
      {linked.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-2xs text-muted">已关联：</span>
          {linked.map((c) => (
            <Badge key={c.id} tone="outline">
              {c.title}
              <button
                type="button"
                onClick={() => onUnlink(c.id)}
                className="ml-1 text-muted hover:text-danger"
                aria-label="取消关联"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-default">
        <label className="flex items-center gap-1.5 text-2xs text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excerpt.isMaterial}
            onChange={onToggleMaterial}
            className="accent-neutral-700 dark:accent-neutral-300"
          />
          <Bookmark size={11} /> 标记为素材
        </label>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenLink}
            title="关联到自媒体选题"
          >
            <Link2 size={12} /> 关联
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} title="编辑摘录">
            <Pencil size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="删除摘录"
            className="hover:text-danger"
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LinkContentModal({
  open,
  excerpt,
  contentItems,
  onClose,
  onLink,
  onUnlink,
}: {
  open: boolean;
  excerpt: Excerpt | null;
  contentItems: ContentItem[];
  onClose: () => void;
  onLink: (contentId: string) => void;
  onUnlink: (contentId: string) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="关联到自媒体选题"
      description="选择将该摘录作为选题的素材引用（可多选）。"
      size="md"
      footer={
        <Button variant="primary" onClick={onClose}>
          完成
        </Button>
      }
    >
      {!excerpt ? (
        <EmptyState icon={<Library size={20} />} title="未选择摘录" />
      ) : contentItems.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">
          暂无自媒体选题，请先在「自媒体」模块创建。
        </p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {contentItems.map((c) => {
            const linked = excerpt.linkedContentIds.includes(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-default bg-surface"
              >
                <div className="min-w-0">
                  <p className="text-sm text-primary truncate">{c.title}</p>
                  <p className="text-2xs text-muted">{c.direction || "—"}</p>
                </div>
                <Button
                  variant={linked ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => (linked ? onUnlink(c.id) : onLink(c.id))}
                >
                  {linked ? "取消关联" : "关联"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
