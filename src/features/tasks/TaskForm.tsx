import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_MODULE_LABELS,
} from "@/lib/labels";
import { toLocalInputValue, fromDateInputValue } from "@/lib/date";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskModule,
} from "@/types";

const DEFAULT_FORM = {
  title: "",
  module: "todo" as TaskModule,
  relatedId: "",
  dueDate: "",
  priority: "medium" as TaskPriority,
  remindAt: "",
  status: "todo" as TaskStatus,
  note: "",
};

export function TaskForm({
  open,
  task,
  onClose,
}: {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}) {
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const projects = useProjectStore((s) => s.projects);
  const content = useContentStore((s) => s.items);
  const culture = useCultureStore((s) => s.items);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (task) {
      setForm({
        title: task.title,
        module: task.module,
        relatedId: task.relatedId ?? "",
        dueDate: toLocalInputValue(task.dueDate),
        priority: task.priority,
        remindAt: toLocalInputValue(task.remindAt),
        status: task.status,
        note: task.note ?? "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, task]);

  // 关联选项
  const relatedOptions = (() => {
    if (form.module === "project") return projects.map((p) => ({ id: p.id, label: p.name }));
    if (form.module === "media") return content.map((c) => ({ id: c.id, label: c.title }));
    if (form.module === "culture") return culture.map((c) => ({ id: c.id, label: c.title }));
    return [];
  })();

  const submit = () => {
    if (!form.title.trim()) {
      setError("标题不能为空");
      return;
    }
    const payload = {
      title: form.title.trim(),
      module: form.module,
      relatedId: form.relatedId || undefined,
      dueDate: form.dueDate ? fromDateInputValue(form.dueDate) : undefined,
      priority: form.priority,
      remindAt: form.remindAt ? fromDateInputValue(form.remindAt) : undefined,
      status: form.status,
      note: form.note.trim() || undefined,
    };
    if (task) {
      updateTask(task.id, payload);
    } else {
      addTask(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "编辑待办" : "新建待办"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={submit}>
            {task ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="标题" required error={error}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例如：完成项目复盘文档"
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="所属模块">
            <Select
              value={form.module}
              onChange={(e) =>
                setForm({ ...form, module: e.target.value as TaskModule, relatedId: "" })
              }
            >
              {(Object.keys(TASK_MODULE_LABELS) as TaskModule[]).map((m) => (
                <option key={m} value={m}>
                  {TASK_MODULE_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="优先级">
            <Select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as TaskPriority })
              }
            >
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {form.module !== "todo" && relatedOptions.length > 0 && (
          <Field label="关联项目/内容" hint="避免重复录入，关联到对应模块的具体条目">
            <Select
              value={form.relatedId}
              onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
            >
              <option value="">不关联</option>
              {relatedOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="截止时间">
            <Input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Field>
          <Field label="提醒时间">
            <Input
              type="datetime-local"
              value={form.remindAt}
              onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
            />
          </Field>
        </div>

        <Field label="状态">
          <Select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as TaskStatus })
            }
          >
            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="备注">
          <Textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="补充说明、上下文、链接等"
            rows={3}
          />
        </Field>
      </div>
    </Modal>
  );
}
