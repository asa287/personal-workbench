import { useEffect, useMemo, useState } from "react";
import { Link2, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { IELTS_COURSE_TYPE_LABELS } from "@/lib/labels";
import { todayISODate } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { IELTSCourse, IELTSCourseType } from "@/types";

// 表单内部状态
interface FormState {
  date: string;
  type: IELTSCourseType;
  topic: string;
  lecturer: string;
  minutes: string;
  dailyReview: string;
  relatedTaskIds: string[];
}

function emptyForm(): FormState {
  return {
    date: todayISODate(),
    type: "lecture",
    topic: "",
    lecturer: "",
    minutes: "",
    dailyReview: "",
    relatedTaskIds: [],
  };
}

function courseToForm(c: IELTSCourse): FormState {
  return {
    date: c.date,
    type: c.type,
    topic: c.topic,
    lecturer: c.lecturer ?? "",
    minutes: c.minutes,
    dailyReview: c.dailyReview ?? "",
    relatedTaskIds: [...c.relatedTaskIds],
  };
}

const COURSE_TYPES: IELTSCourseType[] = ["lecture", "seminar"];

export function CourseForm({
  open,
  course,
  onClose,
}: {
  open: boolean;
  course: IELTSCourse | null;
  onClose: () => void;
}) {
  const addCourse = useIELTSStore((s) => s.addCourse);
  const updateCourse = useIELTSStore((s) => s.updateCourse);
  const tasks = useTaskStore((s) => s.tasks);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showRelated, setShowRelated] = useState(false);

  // 打开时同步初始值
  useEffect(() => {
    if (!open) return;
    if (course) {
      setForm(courseToForm(course));
      setShowRelated(course.relatedTaskIds.length > 0);
    } else {
      setForm(emptyForm());
      setShowRelated(false);
    }
  }, [open, course]);

  const valid = useMemo(
    () => form.date.trim() !== "" && form.topic.trim() !== "",
    [form.date, form.topic]
  );

  const submit = () => {
    if (!valid) return;
    const payload = {
      date: form.date,
      type: form.type,
      topic: form.topic.trim(),
      lecturer: form.lecturer.trim() || undefined,
      minutes: form.minutes.trim(),
      dailyReview: form.dailyReview.trim() || undefined,
      relatedTaskIds: form.relatedTaskIds,
    };
    if (course) {
      updateCourse(course.id, payload);
    } else {
      addCourse(payload);
    }
    onClose();
  };

  // Cmd/Ctrl + Enter 快捷提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  // 切换关联待办选中态
  const toggleTask = (id: string) => {
    setForm((f) => ({
      ...f,
      relatedTaskIds: f.relatedTaskIds.includes(id)
        ? f.relatedTaskIds.filter((t) => t !== id)
        : [...f.relatedTaskIds, id],
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? "编辑课程纪要" : "新建课程纪要"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            {course ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* 日期 + 类型 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期" required>
            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
            />
          </Field>
          <Field label="类型" required>
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as IELTSCourseType,
                }))
              }
            >
              {COURSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IELTS_COURSE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="主题" required>
          <Input
            value={form.topic}
            onChange={(e) =>
              setForm((f) => ({ ...f, topic: e.target.value }))
            }
            placeholder="如：Writing Task 2 结构讲解"
            autoFocus
          />
        </Field>

        <Field label="讲师" hint="可选">
          <Input
            value={form.lecturer}
            onChange={(e) =>
              setForm((f) => ({ ...f, lecturer: e.target.value }))
            }
            placeholder="如：Mr. Smith"
          />
        </Field>

        <Field label="会议纪要" required>
          <Textarea
            rows={6}
            value={form.minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, minutes: e.target.value }))
            }
            placeholder="课堂要点、关键论点、案例…"
          />
        </Field>

        <Field label="每日复盘" hint="可选，今日心得与待加强项">
          <Textarea
            rows={3}
            value={form.dailyReview}
            onChange={(e) =>
              setForm((f) => ({ ...f, dailyReview: e.target.value }))
            }
            placeholder="今日学到了什么？哪里需要加强？"
          />
        </Field>

        {/* 关联待办：可折叠多选 */}
        <div className="border border-default rounded-md">
          <button
            type="button"
            onClick={() => setShowRelated((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-secondary hover:bg-hover transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Link2 size={12} />
              关联待办
              {form.relatedTaskIds.length > 0 && (
                <Badge tone="silver">{form.relatedTaskIds.length}</Badge>
              )}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                "text-muted transition-transform",
                showRelated && "rotate-180"
              )}
            />
          </button>
          {showRelated && (
            <div className="border-t border-default max-h-48 overflow-y-auto p-1.5">
              {tasks.length === 0 ? (
                <div className="text-2xs text-muted px-2 py-3 text-center">
                  暂无待办
                </div>
              ) : (
                <div className="space-y-0.5">
                  {tasks.map((t) => {
                    const checked = form.relatedTaskIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hover cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(t.id)}
                          className="h-3.5 w-3.5 rounded border-default accent-neutral-900 dark:accent-neutral-100"
                        />
                        <span
                          className={cn(
                            "text-xs truncate flex-1",
                            checked ? "text-primary" : "text-secondary",
                            t.status === "done" && "line-through text-muted"
                          )}
                        >
                          {t.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
