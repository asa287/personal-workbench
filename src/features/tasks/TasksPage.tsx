import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, CheckCircle2, Circle, Clock, CalendarClock, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_MODULE_LABELS,
  PRIORITY_DOT,
  PRIORITY_TEXT,
} from "@/lib/labels";
import {
  fmtDateTime,
  fmtRelative,
  isOverdue,
  isDueToday,
  toLocalInputValue,
  fromDateInputValue,
  isThisWeekISO,
} from "@/lib/date";
import type { Task, TaskPriority, TaskStatus, TaskModule } from "@/types";
import { cn } from "@/lib/cn";
import { TaskForm } from "./TaskForm";

export default function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const completeTask = useTaskStore((s) => s.completeTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const postponeTask = useTaskStore((s) => s.postponeTask);
  const projects = useProjectStore((s) => s.projects);
  const content = useContentStore((s) => s.items);
  const culture = useCultureStore((s) => s.items);

  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filterModule, setFilterModule] = useState<TaskModule | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all" | "overdue" | "today">("all");

  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  // 视图切换：列表 / 日历
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  // 日历当前展示月份
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  // 日历中被点击展开的日期
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // 从 URL 同步：?new=1 / ?filter=overdue|today
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
    const f = params.get("filter");
    if (f === "overdue") setFilterStatus("overdue");
    if (f === "today") setFilterStatus("today");
  }, [params, setParams]);

  const relatedLabel = (t: Task): string | null => {
    if (!t.relatedId) return null;
    if (t.module === "project") {
      return projects.find((p) => p.id === t.relatedId)?.name ?? null;
    }
    if (t.module === "media") {
      return content.find((c) => c.id === t.relatedId)?.title ?? null;
    }
    if (t.module === "culture") {
      return culture.find((c) => c.id === t.relatedId)?.title ?? null;
    }
    return null;
  };

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (query) {
          const q = query.toLowerCase();
          if (
            !t.title.toLowerCase().includes(q) &&
            !(t.note ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        if (filterModule !== "all" && t.module !== filterModule) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        if (filterStatus === "overdue") {
          if (t.status === "done") return false;
          if (!isOverdue(t.dueDate)) return false;
        } else if (filterStatus === "today") {
          if (t.status === "done") return false;
          if (!isDueToday(t.dueDate)) return false;
        } else if (filterStatus !== "all" && t.status !== filterStatus) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // 未完成在前
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;
        // 然后按到期时间
        if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [tasks, query, filterModule, filterPriority, filterStatus]);

  // 分组：今日 / 本周 / 之后 / 无截止 / 已完成
  const groups = useMemo(() => {
    const g: { key: string; label: string; items: Task[] }[] = [
      { key: "overdue", label: "逾期", items: [] },
      { key: "today", label: "今日", items: [] },
      { key: "week", label: "本周", items: [] },
      { key: "later", label: "之后", items: [] },
      { key: "nodue", label: "无截止时间", items: [] },
      { key: "done", label: "已完成", items: [] },
    ];
    filtered.forEach((t) => {
      if (t.status === "done") {
        g[5].items.push(t);
      } else if (isOverdue(t.dueDate)) {
        g[0].items.push(t);
      } else if (isDueToday(t.dueDate)) {
        g[1].items.push(t);
      } else if (isThisWeekISO(t.dueDate)) {
        g[2].items.push(t);
      } else if (t.dueDate) {
        g[3].items.push(t);
      } else {
        g[4].items.push(t);
      }
    });
    return g.filter((x) => x.items.length);
  }, [filtered]);

  // 日历视图：当月网格（从本月第一天的周一到本月最后一天的周日）
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  // 日历视图：按 dueDate 分桶（仅含有截止时间的任务）
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => {
      if (!t.dueDate) return;
      try {
        const key = format(parseISO(t.dueDate), "yyyy-MM-dd");
        const arr = map.get(key);
        if (arr) arr.push(t);
        else map.set(key, [t]);
      } catch {
        // 忽略非法日期
      }
    });
    return map;
  }, [filtered]);

  // 日历视图：取某日任务
  const tasksForDay = (day: Date): Task[] => {
    return tasksByDay.get(format(day, "yyyy-MM-dd")) ?? [];
  };

  // 日历视图：无截止时间的任务数
  const noDueCount = useMemo(
    () => filtered.filter((t) => !t.dueDate).length,
    [filtered]
  );

  // 顶部进度
  const stats = useMemo(() => {
    const today = tasks.filter((t) => isDueToday(t.dueDate));
    const todayDone = today.filter((t) => t.status === "done").length;
    const week = tasks.filter((t) => isThisWeekISO(t.dueDate));
    const weekDone = week.filter((t) => t.status === "done").length;
    return {
      todayTotal: today.length,
      todayDone,
      todayRate: today.length ? (todayDone / today.length) * 100 : 0,
      weekTotal: week.length,
      weekDone,
      weekRate: week.length ? (weekDone / week.length) * 100 : 0,
    };
  }, [tasks]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setFormOpen(true);
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      {/* 顶部状态 */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="surface-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs text-muted uppercase tracking-wider">
              今日完成率
            </span>
            <span className="font-mono text-sm text-secondary tabular-nums">
              {stats.todayDone} / {stats.todayTotal}
            </span>
          </div>
          <ProgressBar value={stats.todayRate} />
        </div>
        <div className="surface-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs text-muted uppercase tracking-wider">
              本周完成率
            </span>
            <span className="font-mono text-sm text-secondary tabular-nums">
              {stats.weekDone} / {stats.weekTotal}
            </span>
          </div>
          <ProgressBar value={stats.weekRate} tone="silver" />
        </div>
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            placeholder="搜索待办…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value as TaskModule | "all")}
          className="w-auto"
        >
          <option value="all">全部模块</option>
          {(Object.keys(TASK_MODULE_LABELS) as TaskModule[]).map((m) => (
            <option key={m} value={m}>
              {TASK_MODULE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select
          value={filterPriority}
          onChange={(e) =>
            setFilterPriority(e.target.value as TaskPriority | "all")
          }
          className="w-auto"
        >
          <option value="all">全部优先级</option>
          {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as typeof filterStatus)
          }
          className="w-auto"
        >
          <option value="all">全部状态</option>
          <option value="overdue">仅逾期</option>
          <option value="today">仅今日</option>
          <option value="todo">待办</option>
          <option value="doing">进行中</option>
          <option value="done">已完成</option>
          <option value="postponed">已延后</option>
        </Select>
        <div className="flex-1" />
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v)}
          options={[
            { value: "list", label: "列表" },
            { value: "calendar", label: "日历" },
          ]}
        />
        <Button variant="primary" size="md" onClick={openNew}>
          <Plus size={14} /> 新建待办
        </Button>
      </div>

      {/* 列表视图 */}
      {viewMode === "list" &&
        (filtered.length === 0 ? (
          <EmptyState
            icon={<Filter size={20} />}
            title="暂无待办"
            description="点击右上角新建，或调整筛选条件查看更多。"
            action={
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={14} /> 新建待办
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
                    {g.label}
                  </h3>
                  <span className="text-2xs text-muted">{g.items.length}</span>
                  <div className="flex-1 h-px bg-[var(--border-default)]" />
                </div>
                <div className="space-y-1.5">
                  {g.items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      relatedName={relatedLabel(t)}
                      onToggle={() =>
                        t.status === "done"
                          ? useTaskStore
                              .getState()
                              .toggleStatus(t.id, "todo")
                          : completeTask(t.id)
                      }
                      onEdit={() => openEdit(t)}
                      onPostpone={() => postponeTask(t.id, 1)}
                      onDelete={() => setDeleting(t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* 日历视图 */}
      {viewMode === "calendar" &&
        (filtered.length === 0 ? (
          <EmptyState
            icon={<Filter size={20} />}
            title="暂无待办"
            description="点击右上角新建，或调整筛选条件查看更多。"
            action={
              <Button variant="primary" size="md" onClick={openNew}>
                <Plus size={14} /> 新建待办
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {/* 月份导航 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  title="上一月"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm font-semibold text-primary tabular-nums min-w-[96px] text-center">
                  {format(calendarMonth, "yyyy年M月")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  title="下一月"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCalendarMonth(new Date());
                  setSelectedDay(null);
                }}
              >
                回到今天
              </Button>
            </div>

            {/* 日历网格 */}
            <div className="surface-card rounded-lg p-2">
              {/* 表头：周一到周日 */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-2xs text-muted uppercase tracking-wider py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* 日期格 */}
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const today = isToday(day);
                  const dayTasks = tasksForDay(day);
                  const openCount = dayTasks.filter(
                    (t) => t.status !== "done"
                  ).length;
                  const doneCount = dayTasks.filter(
                    (t) => t.status === "done"
                  ).length;
                  const hasOverdue = dayTasks.some(
                    (t) => t.status !== "done" && isOverdue(t.dueDate)
                  );
                  const selected = selectedDay
                    ? isSameDay(day, selectedDay)
                    : false;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(selected ? null : day)}
                      className={cn(
                        "relative min-h-[68px] p-1.5 rounded-md border text-left transition-colors flex flex-col",
                        today
                          ? "bg-brand-soft border-brand-border"
                          : selected
                          ? "bg-hover border-strong"
                          : "border-transparent hover:bg-hover"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            !inMonth
                              ? "text-muted opacity-40"
                              : today
                              ? "text-brand"
                              : "text-primary"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {hasOverdue && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-danger mt-0.5"
                            title="有逾期任务"
                          />
                        )}
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-1">
                        {openCount > 0 && (
                          <Badge tone="neutral">{openCount}</Badge>
                        )}
                        {doneCount > 0 && (
                          <span className="text-2xs text-muted">
                            ✓ {doneCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 无截止时间提示 */}
            {noDueCount > 0 && (
              <div className="text-2xs text-muted px-1">
                {noDueCount} 项无截止时间，未在日历显示
              </div>
            )}

            {/* 选中日期的任务列表 */}
            {selectedDay && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
                    {format(selectedDay, "yyyy年M月d日")}
                    {isToday(selectedDay) && (
                      <span className="ml-1 text-brand normal-case">
                        · 今天
                      </span>
                    )}
                  </h3>
                  <span className="text-2xs text-muted">
                    {tasksForDay(selectedDay).length}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-default)]" />
                </div>
                {tasksForDay(selectedDay).length === 0 ? (
                  <div className="text-sm text-muted px-3 py-4 text-center">
                    该日无待办
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {tasksForDay(selectedDay).map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        relatedName={relatedLabel(t)}
                        onToggle={() =>
                          t.status === "done"
                            ? useTaskStore
                                .getState()
                                .toggleStatus(t.id, "todo")
                            : completeTask(t.id)
                        }
                        onEdit={() => openEdit(t)}
                        onPostpone={() => postponeTask(t.id, 1)}
                        onDelete={() => setDeleting(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

      {/* 表单 */}
      <TaskForm
        open={formOpen}
        task={editing}
        onClose={() => setFormOpen(false)}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleting}
        title="删除待办"
        message={
          deleting
            ? `确认删除「${deleting.title}」？此操作不可恢复。`
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteTask(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function TaskRow({
  task,
  relatedName,
  onToggle,
  onEdit,
  onPostpone,
  onDelete,
}: {
  task: Task;
  relatedName?: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onPostpone: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  const overdue = !done && isOverdue(task.dueDate);
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors",
        overdue
          ? "border-danger/30 bg-danger/5"
          : "border-default bg-surface hover:bg-hover"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "shrink-0 transition-colors",
          done ? "text-neutral-600 dark:text-neutral-300" : "text-muted hover:text-primary"
        )}
        aria-label={done ? "标记为未完成" : "标记为已完成"}
      >
        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm truncate",
            done ? "text-muted line-through" : "text-primary"
          )}
        >
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-2xs text-muted">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              PRIORITY_TEXT[task.priority]
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                PRIORITY_DOT[task.priority]
              )}
            />
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span>·</span>
          <span>{TASK_MODULE_LABELS[task.module]}</span>
          {relatedName && (
            <>
              <span>·</span>
              <span className="truncate max-w-[140px]">{relatedName}</span>
            </>
          )}
          {task.dueDate && (
            <>
              <span>·</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue && "text-danger",
                  isDueToday(task.dueDate) && !done && "text-warning"
                )}
              >
                <CalendarClock size={10} />
                {fmtRelative(task.dueDate)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!done && (
          <Button variant="ghost" size="icon" onClick={onPostpone} title="延后 1 天">
            <Clock size={14} />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit} title="编辑">
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title="删除"
          className="hover:text-danger"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}
