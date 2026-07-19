import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { cn } from "@/lib/cn";
import type { Collection } from "@/types";

// 合集预设颜色（仅用于合集圆点标识，不扩散到其他 UI）
const PRESET_COLORS = [
  "#3b82f6", // 蓝
  "#10b981", // 绿
  "#f59e0b", // 琥珀
  "#8b5cf6", // 紫
  "#ec4899", // 粉
  "#6b7280", // 灰
];

// 未归类回退色
export const UNCATEGORIZED_COLOR = "#6b7280";

interface CollectionForm {
  name: string;
  description: string;
  color: string;
}

const EMPTY_FORM: CollectionForm = {
  name: "",
  description: "",
  color: PRESET_COLORS[0],
};

export function CollectionManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const collections = useCollectionStore((s) => s.collections);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const updateCollection = useCollectionStore((s) => s.updateCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const projects = useProjectStore((s) => s.projects);
  const updateProject = useProjectStore((s) => s.updateProject);

  // editingId: null = 未在编辑；"" = 新建；collectionId = 编辑该合集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollectionForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  // 关闭时重置内部状态
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError("");
      setDeleteTarget(null);
    }
  }, [open]);

  // 每个合集下的项目数
  const countByCollection = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      if (p.collectionId) {
        map.set(p.collectionId, (map.get(p.collectionId) ?? 0) + 1);
      }
    });
    return map;
  }, [projects]);

  const startCreate = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setError("");
  };

  const startEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description ?? "",
      color: c.color ?? PRESET_COLORS[0],
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const save = () => {
    if (!form.name.trim()) {
      setError("合集名称不能为空");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color,
    };
    if (editingId === "") {
      addCollection(payload);
    } else if (editingId) {
      updateCollection(editingId, payload);
    }
    setEditingId(null);
    setError("");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    // 删除合集前，把归属该合集的项目改为未归类（不删项目本身）
    projects
      .filter((p) => p.collectionId === deleteTarget.id)
      .forEach((p) => updateProject(p.id, { collectionId: undefined }));
    deleteCollection(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="合集管理" size="lg">
        <div className="space-y-3">
          {/* 顶部操作 */}
          {editingId === null && (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={startCreate}>
                <Plus size={14} /> 新建合集
              </Button>
            </div>
          )}

          {/* 内联表单（新建 / 编辑） */}
          {editingId !== null && (
            <div className="rounded-lg border border-default bg-elevated/40 p-3 space-y-3">
              <h4 className="text-sm font-medium text-primary">
                {editingId === "" ? "新建合集" : "编辑合集"}
              </h4>
              <Field label="名称" required error={error}>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：技术成长"
                  autoFocus
                  invalid={!!error}
                />
              </Field>
              <Field label="描述" hint="可选，简短说明合集主题">
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="例如：围绕编程语言与工程实践的项目集合"
                  rows={2}
                />
              </Field>
              <Field label="颜色">
                <ColorPicker
                  value={form.color}
                  onChange={(c) => setForm({ ...form, color: c })}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  取消
                </Button>
                <Button variant="primary" size="sm" onClick={save}>
                  {editingId === "" ? "创建" : "保存"}
                </Button>
              </div>
            </div>
          )}

          {/* 列表 */}
          {collections.length === 0 ? (
            <div className="text-center text-xs text-muted py-10">
              暂无合集，点击「新建合集」开始创建
            </div>
          ) : (
            <ul className="space-y-1.5">
              {collections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-default bg-surface px-3 py-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.color ?? UNCATEGORIZED_COLOR }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-2xs text-tertiary truncate">
                        {c.description}
                      </div>
                    )}
                  </div>
                  <Badge tone="outline" className="shrink-0">
                    {countByCollection.get(c.id) ?? 0} 项目
                  </Badge>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(c)}
                      aria-label="编辑合集"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted hover:text-danger"
                      onClick={() => setDeleteTarget(c)}
                      aria-label="删除合集"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除合集"
        message={
          <>
            确定删除合集「{deleteTarget?.name}」吗？
            <br />
            该合集下的项目不会被删除，但会变为「未归类」。
          </>
        }
        confirmText="删除"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// 颜色选择器（6 个预设色）
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            value === c
              ? "border-strong scale-110"
              : "border-default hover:border-strong"
          )}
          style={{ backgroundColor: c }}
          aria-label={`选择颜色 ${c}`}
        >
          {value === c && <Check size={12} className="text-white" />}
        </button>
      ))}
    </div>
  );
}
