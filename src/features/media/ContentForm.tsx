import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/Tag";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import {
  PLATFORM_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
  CULTURE_TYPE_LABELS,
} from "@/lib/labels";
import { toLocalInputValue, fromDateInputValue } from "@/lib/date";
import type { ContentItem, MediaPlatform, ContentStatus } from "@/types";

// 表单内部状态：数值字段用 string 以便受控输入
interface FormState {
  platform: MediaPlatform;
  title: string;
  direction: string;
  tags: string[];
  referenceLinks: string[];
  materialIds: string[];
  status: ContentStatus;
  publishDate: string; // datetime-local 输入值
  views: string;
  likes: string;
  collects: string;
  comments: string;
  review: string;
}

const DEFAULT_FORM: FormState = {
  platform: "xiaohongshu",
  title: "",
  direction: "",
  tags: [],
  referenceLinks: [],
  materialIds: [],
  status: "idea",
  publishDate: "",
  views: "0",
  likes: "0",
  collects: "0",
  comments: "0",
  review: "",
};

export function ContentForm({
  open,
  item,
  onClose,
  // 预设字段，用于日历点击预填 publishDate、或「标记已发布」预填 status
  preset,
}: {
  open: boolean;
  item: ContentItem | null;
  onClose: () => void;
  preset?: Partial<ContentItem>;
}) {
  const addItem = useContentStore((s) => s.addItem);
  const updateItem = useContentStore((s) => s.updateItem);
  const culture = useCultureStore((s) => s.items);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState("");

  // 打开时初始化：默认值 ← 已有 item ← preset 覆盖
  useEffect(() => {
    if (!open) return;
    setError("");
    const base: FormState = item
      ? {
          platform: item.platform,
          title: item.title,
          direction: item.direction ?? "",
          tags: [...item.tags],
          referenceLinks: [...item.referenceLinks],
          materialIds: [...item.materialIds],
          status: item.status,
          publishDate: toLocalInputValue(item.publishDate),
          views: String(item.views ?? 0),
          likes: String(item.likes ?? 0),
          collects: String(item.collects ?? 0),
          comments: String(item.comments ?? 0),
          review: item.review ?? "",
        }
      : { ...DEFAULT_FORM };
    if (preset) {
      if (preset.platform) base.platform = preset.platform;
      if (typeof preset.title === "string") base.title = preset.title;
      if (typeof preset.direction === "string") base.direction = preset.direction;
      if (preset.tags) base.tags = [...preset.tags];
      if (preset.referenceLinks) base.referenceLinks = [...preset.referenceLinks];
      if (preset.materialIds) base.materialIds = [...preset.materialIds];
      if (preset.status) base.status = preset.status;
      if (preset.publishDate)
        base.publishDate = toLocalInputValue(preset.publishDate);
      if (typeof preset.views === "number") base.views = String(preset.views);
      if (typeof preset.likes === "number") base.likes = String(preset.likes);
      if (typeof preset.collects === "number") base.collects = String(preset.collects);
      if (typeof preset.comments === "number") base.comments = String(preset.comments);
      if (typeof preset.review === "string") base.review = preset.review;
    }
    setForm(base);
  }, [open, item, preset]);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  // 参考链接动态增删
  const updateLink = (idx: number, val: string) => {
    setForm((f) => {
      const next = [...f.referenceLinks];
      next[idx] = val;
      return { ...f, referenceLinks: next };
    });
  };
  const addLink = () =>
    setForm((f) => ({ ...f, referenceLinks: [...f.referenceLinks, ""] }));
  const removeLink = (idx: number) =>
    setForm((f) => ({
      ...f,
      referenceLinks: f.referenceLinks.filter((_, i) => i !== idx),
    }));

  // 素材多选
  const toggleMaterial = (id: string) => {
    setForm((f) => ({
      ...f,
      materialIds: f.materialIds.includes(id)
        ? f.materialIds.filter((x) => x !== id)
        : [...f.materialIds, id],
    }));
  };

  // 可选素材：culture 中标记为 reusableMaterial 或含 isMaterial 摘录的条目
  const materialOptions = culture
    .filter((c) => c.reusableMaterial || c.excerpts.some((e) => e.isMaterial))
    .map((c) => ({ id: c.id, title: c.title, type: c.type }));

  const submit = () => {
    const title = form.title.trim();
    if (!title) {
      setError("标题不能为空");
      return;
    }
    const payload = {
      platform: form.platform,
      title,
      direction: form.direction.trim() || undefined,
      tags: form.tags,
      referenceLinks: form.referenceLinks.filter(Boolean),
      materialIds: form.materialIds,
      status: form.status,
      publishDate: form.publishDate
        ? fromDateInputValue(form.publishDate)
        : undefined,
      views: Number(form.views) || 0,
      likes: Number(form.likes) || 0,
      collects: Number(form.collects) || 0,
      comments: Number(form.comments) || 0,
      review: form.review.trim() || undefined,
    };
    if (item) {
      updateItem(item.id, payload);
    } else {
      addItem(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "编辑内容" : "新建选题"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={submit}>
            {item ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="标题" required error={error}>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="例如：读《深度工作》后我的 3 个改变"
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="平台">
            <Select
              value={form.platform}
              onChange={(e) =>
                setField("platform", e.target.value as MediaPlatform)
              }
            >
              {(Object.keys(PLATFORM_LABELS) as MediaPlatform[]).map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="状态">
            <Select
              value={form.status}
              onChange={(e) =>
                setField("status", e.target.value as ContentStatus)
              }
            >
              {CONTENT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {CONTENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="方向" hint="例如：读书笔记、生活方式、职业思考">
          <Input
            value={form.direction}
            onChange={(e) => setField("direction", e.target.value)}
            placeholder="内容方向 / 选题分类"
          />
        </Field>

        <Field label="标签">
          <TagInput
            tags={form.tags}
            onChange={(tags) => setField("tags", tags)}
            placeholder="输入后回车添加标签"
          />
        </Field>

        <Field label="参考链接" hint="每行一条 URL，可动态增删">
          <div className="space-y-1.5">
            {form.referenceLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={link}
                  onChange={(e) => updateLink(idx, e.target.value)}
                  placeholder="https://..."
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(idx)}
                  title="移除"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addLink}>
              + 添加链接
            </Button>
          </div>
        </Field>

        <Field label="发布时间">
          <Input
            type="datetime-local"
            value={form.publishDate}
            onChange={(e) => setField("publishDate", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-4 gap-3">
          <Field label="浏览">
            <Input
              type="number"
              min={0}
              value={form.views}
              onChange={(e) => setField("views", e.target.value)}
            />
          </Field>
          <Field label="点赞">
            <Input
              type="number"
              min={0}
              value={form.likes}
              onChange={(e) => setField("likes", e.target.value)}
            />
          </Field>
          <Field label="收藏">
            <Input
              type="number"
              min={0}
              value={form.collects}
              onChange={(e) => setField("collects", e.target.value)}
            />
          </Field>
          <Field label="评论">
            <Input
              type="number"
              min={0}
              value={form.comments}
              onChange={(e) => setField("comments", e.target.value)}
            />
          </Field>
        </div>

        <Field label="关联素材" hint="从个人积累中标记为可复用素材的条目">
          {materialOptions.length === 0 ? (
            <p className="text-2xs text-muted">
              暂无可关联素材，请先在「个人积累」中标记。
            </p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-elevated border border-default rounded-md">
              {materialOptions.map((m) => {
                const checked = form.materialIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-hover cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMaterial(m.id)}
                      className="accent-neutral-500"
                    />
                    <span className="truncate flex-1">{m.title}</span>
                    <span className="text-2xs text-muted">
                      {CULTURE_TYPE_LABELS[m.type]}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="复盘结论">
          <Textarea
            value={form.review}
            onChange={(e) => setField("review", e.target.value)}
            placeholder="发布后的数据复盘、可复用经验、下次改进点"
            rows={3}
          />
        </Field>
      </div>
    </Modal>
  );
}
