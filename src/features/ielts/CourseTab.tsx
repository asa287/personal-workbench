import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  ChevronDown,
  Link2,
} from "lucide-react";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IELTS_COURSE_TYPE_LABELS } from "@/lib/labels";
import { fmtFullDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { IELTSCourse, Task } from "@/types";
import { CourseForm } from "./CourseForm";

export default function CourseTab({ newSignal }: { newSignal: number }) {
  const courses = useIELTSStore((s) => s.courses);
  const deleteCourse = useIELTSStore((s) => s.deleteCourse);
  const tasks = useTaskStore((s) => s.tasks);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IELTSCourse | null>(null);
  const [deleting, setDeleting] = useState<IELTSCourse | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 外部触发新建（?new=1）
  useEffect(() => {
    if (newSignal > 0) {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSignal]);

  const sorted = useMemo(
    () => [...courses].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [courses]
  );

  // 待办 id -> task 映射，用于展示关联待办标题
  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (c: IELTSCourse) => {
    setEditing(c);
    setOpen(true);
  };

  return (
    <>
      {/* 工具栏 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
          课程纪要
          <span className="ml-1.5 text-muted">{courses.length}</span>
        </h3>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={14} /> 新建纪要
        </Button>
      </div>

      {/* 列表 */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="还没有课程纪要"
          description="记录线下课程的会议纪要与每日复盘。"
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((c) => (
            <CourseRow
              key={c.id}
              course={c}
              taskMap={taskMap}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId((id) => (id === c.id ? null : c.id))
              }
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleting(c)}
            />
          ))}
        </div>
      )}

      {/* 表单 */}
      <CourseForm
        open={open}
        course={editing}
        onClose={() => setOpen(false)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除课程纪要"
        message={
          deleting
            ? `确认删除 ${fmtFullDate(deleting.date)} 的课程纪要「${deleting.topic}」？`
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteCourse(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function CourseRow({
  course,
  taskMap,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  course: IELTSCourse;
  taskMap: Map<string, Task>;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-md border border-default bg-surface hover:bg-hover transition-colors overflow-hidden">
      <div
        className="flex items-start gap-3 px-3 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* 左侧：日期 + 类型 */}
        <div className="shrink-0 w-20">
          <div className="text-base font-semibold text-primary tabular-nums">
            {fmtFullDate(course.date).slice(5)}
          </div>
          <Badge
            tone={course.type === "seminar" ? "silver" : "neutral"}
            className="mt-1"
          >
            {IELTS_COURSE_TYPE_LABELS[course.type]}
          </Badge>
        </div>

        {/* 主体 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-primary truncate">
              {course.topic}
            </span>
            {course.dailyReview && (
              <span
                title="含每日复盘"
                className="inline-flex items-center text-silver-500 shrink-0"
              >
                <BookOpen size={12} />
              </span>
            )}
          </div>
          {course.lecturer && (
            <div className="text-2xs text-muted mt-0.5">
              讲师：{course.lecturer}
            </div>
          )}
          <p className="text-2xs text-tertiary mt-1 line-clamp-2">
            {course.minutes}
          </p>
        </div>

        {/* 右侧：展开指示 + 操作 */}
        <div className="flex items-center gap-0.5 shrink-0">
          <ChevronDown
            size={14}
            className={cn(
              "text-muted transition-transform",
              expanded && "rotate-180"
            )}
          />
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="编辑"
            >
              <Edit3 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="删除"
              className="hover:text-danger"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-default space-y-3">
          <div>
            <div className="text-2xs text-muted uppercase tracking-wider mb-1">
              会议纪要
            </div>
            <p className="text-xs text-secondary whitespace-pre-wrap leading-relaxed">
              {course.minutes || "（无）"}
            </p>
          </div>
          {course.dailyReview && (
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <BookOpen size={11} />
                每日复盘
              </div>
              <p className="text-xs text-secondary whitespace-pre-wrap leading-relaxed">
                {course.dailyReview}
              </p>
            </div>
          )}
          {course.relatedTaskIds.length > 0 && (
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Link2 size={11} />
                关联待办
              </div>
              <div className="flex flex-wrap gap-1">
                {course.relatedTaskIds.map((id) => (
                  <Badge key={id} tone="outline">
                    {taskMap.get(id)?.title ?? "已删除"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
