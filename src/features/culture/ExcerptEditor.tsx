import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea, Field } from "@/components/ui/Input";
import { useCultureStore } from "@/stores/useCultureStore";
import type { Excerpt } from "@/types";

/**
 * 单条摘录编辑器（Modal）。
 * 通过 `excerpt` 是否为 null 控制开关；onSave 为「完成」回调（保存与取消均触发，由父级清理状态）。
 */
export function ExcerptEditor({
  cultureId,
  excerpt,
  onSave,
}: {
  cultureId: string;
  excerpt: Excerpt | null;
  onSave: () => void;
}) {
  const updateExcerpt = useCultureStore((s) => s.updateExcerpt);
  const [content, setContent] = useState(() => excerpt?.content ?? "");
  const [isMaterial, setIsMaterial] = useState(() => excerpt?.isMaterial ?? false);
  const [error, setError] = useState("");

  // excerpt 变化时同步表单（同一实例被复用时仍能正确初始化）
  useEffect(() => {
    if (excerpt) {
      setContent(excerpt.content);
      setIsMaterial(excerpt.isMaterial);
      setError("");
    }
  }, [excerpt]);

  if (!excerpt) return null;

  const save = () => {
    if (!content.trim()) {
      setError("摘录内容不能为空");
      return;
    }
    updateExcerpt(cultureId, excerpt.id, {
      content: content.trim(),
      isMaterial,
    });
    onSave();
  };

  return (
    <Modal
      open
      onClose={onSave}
      title="编辑摘录"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onSave}>
            取消
          </Button>
          <Button variant="primary" onClick={save}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="内容" required error={error}>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="摘录原文或自己的笔记…"
            rows={6}
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isMaterial}
            onChange={(e) => setIsMaterial(e.target.checked)}
            className="accent-neutral-700 dark:accent-neutral-300"
          />
          标记为可复用素材
        </label>
      </div>
    </Modal>
  );
}
