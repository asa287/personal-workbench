import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/Tag";
import { useCultureStore } from "@/stores/useCultureStore";
import { CULTURE_TYPE_LABELS, CULTURE_STATUS_LABELS } from "@/lib/labels";
import { fromDateInputValue } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { CultureItem, CultureType, CultureStatus } from "@/types";

/**
 * 评分星组件。
 * 传入 onChange 时可点击（0~max，再次点击当前值清零）；不传时仅展示。
 */
export function Rating({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange?: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i + 1 === value ? 0 : i + 1)}
          className={cn(
            "transition-colors",
            i < value
              ? "text-silver-500"
              : "text-neutral-300 dark:text-neutral-700",
            onChange && "hover:text-silver-300 cursor-pointer"
          )}
        >
          <Star size={14} className={i < value ? "fill-current" : ""} />
        </button>
      ))}
    </div>
  );
}

const DEFAULT_FORM = {
  type: "book" as CultureType,
  title: "",
  creator: "",
  status: "wishlist" as CultureStatus,
  startDate: "",
  finishDate: "",
  rating: 0,
  tags: [] as string[],
  opinion: "",
  note: "",
  reusableMaterial: false,
  posterUrl: "",
};

type FormState = typeof DEFAULT_FORM;

// ISO 转 date input 所需的 yyyy-MM-dd
const toInputDate = (iso?: string): string => (iso ? iso.slice(0, 10) : "");

export function CultureForm({
  open,
  item,
  defaultType = "book",
  onClose,
}: {
  open: boolean;
  item: CultureItem | null;
  defaultType?: CultureType;
  onClose: () => void;
}) {
  const addItem = useCultureStore((s) => s.addItem);
  const updateItem = useCultureStore((s) => s.updateItem);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (item) {
      setForm({
        type: item.type,
        title: item.title,
        creator: item.creator ?? "",
        status: item.status,
        startDate: toInputDate(item.startDate),
        finishDate: toInputDate(item.finishDate),
        rating: item.rating,
        tags: item.tags,
        opinion: item.opinion ?? "",
        note: item.note ?? "",
        reusableMaterial: item.reusableMaterial,
        posterUrl: item.posterUrl ?? "",
      });
    } else {
      // 新建时使用当前 Tab 类型作为默认类型
      setForm({ ...DEFAULT_FORM, type: defaultType });
    }
  }, [open, item, defaultType]);

  const submit = () => {
    if (!form.title.trim()) {
      setError("标题不能为空");
      return;
    }
    const payload = {
      type: form.type,
      title: form.title.trim(),
      creator: form.creator.trim() || undefined,
      status: form.status,
      startDate: form.startDate ? fromDateInputValue(form.startDate) : undefined,
      finishDate: form.finishDate ? fromDateInputValue(form.finishDate) : undefined,
      rating: form.rating,
      tags: form.tags,
      opinion: form.opinion.trim() || undefined,
      note: form.note.trim() || undefined,
      reusableMaterial: form.reusableMaterial,
      posterUrl: form.posterUrl.trim() || undefined,
    };
    if (item) {
      updateItem(item.id, payload);
    } else {
      // 新建时摘录为空，摘录在详情页维护
      addItem({ ...payload, excerpts: [] });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "编辑积累" : "新建积累"}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="类型">
            <Select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as CultureType })
              }
            >
              {(Object.keys(CULTURE_TYPE_LABELS) as CultureType[]).map((t) => (
                <option key={t} value={t}>
                  {CULTURE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="状态">
            <Select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CultureStatus })
              }
            >
              {(Object.keys(CULTURE_STATUS_LABELS) as CultureStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {CULTURE_STATUS_LABELS[s]}
                  </option>
                )
              )}
            </Select>
          </Field>
        </div>

        <Field label="标题" required error={error}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="书名 / 电影名 / 文章标题…"
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
        </Field>

        <Field label="作者 / 创作者">
          <Input
            value={form.creator}
            onChange={(e) => setForm({ ...form, creator: e.target.value })}
            placeholder="作者、导演、主播…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="开始时间">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="完成时间">
            <Input
              type="date"
              value={form.finishDate}
              onChange={(e) => setForm({ ...form, finishDate: e.target.value })}
            />
          </Field>
        </div>

        <Field label="评分">
          <div className="flex items-center gap-2 h-9">
            <Rating
              value={form.rating}
              onChange={(v) => setForm({ ...form, rating: v })}
            />
            <span className="text-2xs text-muted">
              {form.rating > 0 ? `${form.rating} / 5` : "未评分"}
            </span>
          </div>
        </Field>

        <Field label="封面 / 海报链接" hint="用于电影 / 电视剧网格展示，粘贴远程图片地址">
          <Input
            value={form.posterUrl}
            onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
            placeholder="粘贴海报图片链接 https://…"
            type="url"
          />
        </Field>

        <Field label="标签">
          <TagInput
            tags={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
          />
        </Field>

        <Field label="个人观点">
          <Textarea
            value={form.opinion}
            onChange={(e) => setForm({ ...form, opinion: e.target.value })}
            placeholder="一句话总结 / 主观评价…"
            rows={3}
          />
        </Field>

        <Field label="备注">
          <Textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="上下文、来源、待复盘点…"
            rows={3}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.reusableMaterial}
            onChange={(e) =>
              setForm({ ...form, reusableMaterial: e.target.checked })
            }
            className="accent-neutral-700 dark:accent-neutral-300"
          />
          标记为可复用素材（用于自媒体选题）
        </label>
      </div>
    </Modal>
  );
}
