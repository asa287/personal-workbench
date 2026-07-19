import { useMemo, useState } from "react";
import { Link2, BookOpen } from "lucide-react";
import { useCultureStore } from "@/stores/useCultureStore";
import { useContentStore } from "@/stores/useContentStore";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  PLATFORM_LABELS,
  CONTENT_STATUS_LABELS,
  CULTURE_TYPE_LABELS,
} from "@/lib/labels";
import type { CultureItem, MediaPlatform } from "@/types";

// 素材条目：可能是整个 culture 项（reusableMaterial），或某个具体摘录（isMaterial）
interface MaterialEntry {
  cultureId: string;
  cultureTitle: string;
  cultureType: CultureItem["type"];
  excerptId?: string;
  excerptContent?: string;
  kind: "item" | "excerpt";
}

export function MaterialManager({
  platform = "all",
}: {
  // 平台筛选：all 表示全部。仅作用于关联的 content 选题，素材本身来自个人积累不筛选
  platform?: MediaPlatform | "all";
} = {}) {
  const culture = useCultureStore((s) => s.items);
  const allContent = useContentStore((s) => s.items);
  const updateItem = useContentStore((s) => s.updateItem);

  // 按平台筛选内容选题（用于「已关联」与「关联到选题」候选）
  const content = useMemo(
    () =>
      allContent.filter((c) => platform === "all" || c.platform === platform),
    [allContent, platform]
  );

  const [linkTarget, setLinkTarget] = useState<MaterialEntry | null>(null);
  const [linkSelected, setLinkSelected] = useState<string>("");

  // 整理出所有素材条目
  const materials = useMemo<MaterialEntry[]>(() => {
    const list: MaterialEntry[] = [];
    for (const c of culture) {
      const materialExcerpts = c.excerpts.filter((e) => e.isMaterial);
      if (materialExcerpts.length > 0) {
        // 优先以「摘录」维度展示，粒度更细
        for (const e of materialExcerpts) {
          list.push({
            cultureId: c.id,
            cultureTitle: c.title,
            cultureType: c.type,
            excerptId: e.id,
            excerptContent: e.content,
            kind: "excerpt",
          });
        }
      } else if (c.reusableMaterial) {
        // 整条 culture 标记为可复用素材
        list.push({
          cultureId: c.id,
          cultureTitle: c.title,
          cultureType: c.type,
          kind: "item",
        });
      }
    }
    return list;
  }, [culture]);

  // 查找已关联该 culture 的内容选题
  const linkedContentOf = (cultureId: string) =>
    content.filter((c) => c.materialIds.includes(cultureId));

  // 候选可关联的选题（选题 / 草稿中 / 已排期）
  const linkableContent = useMemo(() => {
    if (!linkTarget) return [];
    return content.filter(
      (c) =>
        c.status === "idea" ||
        c.status === "drafting" ||
        c.status === "scheduled"
    );
  }, [linkTarget, content]);

  const closeModal = () => {
    setLinkTarget(null);
    setLinkSelected("");
  };

  const confirmLink = () => {
    if (!linkTarget || !linkSelected) return;
    const target = content.find((c) => c.id === linkSelected);
    if (!target) {
      closeModal();
      return;
    }
    // 避免重复关联
    if (!target.materialIds.includes(linkTarget.cultureId)) {
      updateItem(target.id, {
        materialIds: [...target.materialIds, linkTarget.cultureId],
      });
    }
    closeModal();
  };

  if (materials.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen size={20} />}
        title="暂无可复用素材"
        description="在「个人积累」中将摘录标记为素材，或将条目标记为可复用，即可在此处关联到自媒体选题。"
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary">素材管理</h2>
        <span className="text-2xs text-muted">{materials.length} 条素材</span>
      </div>

      <div className="space-y-2">
        {materials.map((m, idx) => {
          const linked = linkedContentOf(m.cultureId);
          return (
            <Card key={`${m.cultureId}-${m.excerptId ?? "item"}-${idx}`}>
              <CardBody className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge tone="silver">{CULTURE_TYPE_LABELS[m.cultureType]}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">
                      {m.cultureTitle}
                    </div>
                    {m.excerptContent && (
                      <p className="text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">
                        “{m.excerptContent}”
                      </p>
                    )}
                    {m.kind === "item" && (
                      <p className="text-2xs text-muted mt-1">整条标记为可复用素材</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinkTarget(m);
                      setLinkSelected("");
                    }}
                  >
                    <Link2 size={12} /> 关联到选题
                  </Button>
                </div>
                {linked.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-default">
                    <span className="text-2xs text-muted">已关联：</span>
                    {linked.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs bg-elevated border border-default text-secondary"
                      >
                        {c.title}
                        <span className="text-muted">·</span>
                        {PLATFORM_LABELS[c.platform]}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!linkTarget}
        onClose={closeModal}
        title="关联到选题"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              取消
            </Button>
            <Button variant="primary" disabled={!linkSelected} onClick={confirmLink}>
              关联
            </Button>
          </>
        }
      >
        {linkTarget && (
          <div className="space-y-3">
            <div className="text-xs text-tertiary">
              将素材「
              {linkTarget.excerptContent
                ? linkTarget.excerptContent.slice(0, 40) + "…"
                : linkTarget.cultureTitle}
              」关联到选题：
            </div>
            {linkableContent.length === 0 ? (
              <p className="text-2xs text-muted">
                暂无可关联的选题，请先在选题库创建内容。
              </p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {linkableContent.map((c) => {
                  const alreadyLinked = c.materialIds.includes(
                    linkTarget.cultureId
                  );
                  const selected = linkSelected === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-sm ${
                        selected
                          ? "border-strong bg-hover"
                          : "border-default hover:bg-hover"
                      } ${alreadyLinked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="link-target"
                        checked={selected}
                        onChange={() => setLinkSelected(c.id)}
                        disabled={alreadyLinked}
                        className="accent-neutral-500"
                      />
                      <span className="flex-1 truncate">{c.title}</span>
                      <Badge tone="neutral">{PLATFORM_LABELS[c.platform]}</Badge>
                      <span className="text-2xs text-muted">
                        {CONTENT_STATUS_LABELS[c.status]}
                      </span>
                      {alreadyLinked && (
                        <span className="text-2xs text-muted">已关联</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
