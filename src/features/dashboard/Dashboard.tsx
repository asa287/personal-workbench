import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Plus,
  CheckSquare,
  KanbanSquare,
  BookOpen,
  GraduationCap,
  Radio,
  ArrowRight,
} from "lucide-react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { AIAssistButton } from "@/components/shared/AIAssistButton";
import { TaskForm } from "@/features/tasks/TaskForm";
import {
  PRIORITY_LABELS,
  PRIORITY_DOT,
  TASK_MODULE_LABELS,
} from "@/lib/labels";
import { fmtRelative, isOverdue, isDueToday, isDueTomorrow, isThisWeekISO, isThisMonthISO, daysUntil } from "@/lib/date";
import type { Task, Project } from "@/types";
import { cn } from "@/lib/cn";

export default function Dashboard() {
  const navigate = useNavigate();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const ieltsPlans = useIELTSStore((s) => s.plans);
  const ieltsMocks = useIELTSStore((s) => s.mocks);
  const content = useContentStore((s) => s.items);
  const culture = useCultureStore((s) => s.items);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  // 今日优先处理：逾期 + 今日到期 + 紧急/高优先级
  const priorities = useMemo(() => {
    const overdue = openTasks.filter((t) => isOverdue(t.dueDate));
    const today = openTasks.filter((t) => isDueToday(t.dueDate));
    const tomorrow = openTasks.filter((t) => isDueTomorrow(t.dueDate));
    const urgent = openTasks.filter(
      (t) =>
        (t.priority === "urgent" || t.priority === "high") &&
        !overdue.includes(t) &&
        !today.includes(t)
    );
    const merged = [
      ...overdue.sort(byPriority),
      ...today.sort(byPriority),
      ...tomorrow.sort(byPriority),
      ...urgent.sort(byPriority),
    ];
    // 去重
    const seen = new Set<string>();
    return merged.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    }).slice(0, 6);
  }, [openTasks]);

  // 风险提醒
  const risks = useMemo(() => {
    const list: { tone: "danger" | "warning" | "neutral"; text: string; onClick?: () => void }[] = [];
    const overdueCount = openTasks.filter((t) => isOverdue(t.dueDate)).length;
    if (overdueCount) {
      list.push({
        tone: "danger",
        text: `${overdueCount} 项待办已逾期`,
        onClick: () => navigate("/tasks?filter=overdue"),
      });
    }
    const todayCount = openTasks.filter((t) => isDueToday(t.dueDate)).length;
    if (todayCount) {
      list.push({
        tone: "warning",
        text: `${todayCount} 项今日到期`,
        onClick: () => navigate("/tasks?filter=today"),
      });
    }
    // 停滞项目（paused 状态）
    const pausedProjects = projects.filter((p) => p.status === "paused");
    if (pausedProjects.length) {
      list.push({
        tone: "warning",
        text: `${pausedProjects.length} 个项目处于暂停状态`,
        onClick: () => navigate("/projects"),
      });
    }
    // 雅思考试临近
    const examPlan = ieltsPlans[0];
    if (examPlan?.examDate) {
      const days = daysUntil(examPlan.examDate);
      if (days !== null && days >= 0 && days <= 30) {
        list.push({
          tone: days <= 7 ? "danger" : "warning",
          text: `距雅思考试还有 ${days} 天`,
          onClick: () => navigate("/ielts"),
        });
      }
    }
    return list;
  }, [openTasks, projects, ieltsPlans, navigate]);

  // 本周概览
  const weekStats = useMemo(() => {
    const allThisWeek = tasks.filter((t) => isThisWeekISO(t.dueDate));
    const doneThisWeek = tasks.filter(
      (t) => t.status === "done" && isThisWeekISO(t.updatedAt)
    );
    const dueCount = allThisWeek.length;
    const doneCount = doneThisWeek.length;
    const todayDone = tasks.filter(
      (t) => t.status === "done" && isDueToday(t.updatedAt)
    ).length;
    const todayTotal = tasks.filter((t) => isDueToday(t.dueDate)).length;
    return {
      dueCount,
      doneCount,
      todayDone,
      todayTotal,
      todayRate: todayTotal ? (todayDone / todayTotal) * 100 : 0,
      weekRate: dueCount ? (doneThisWeek.length / dueCount) * 100 : 0,
    };
  }, [tasks]);

  const moduleStats = useMemo(() => {
    return {
      tasks: {
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
      },
      projects: {
        total: projects.length,
        doing: projects.filter((p) => p.status === "doing").length,
      },
      ielts: {
        mocks: ieltsMocks.length,
        latest: ieltsMocks.length
          ? [...ieltsMocks].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
          : null,
      },
      media: {
        published: content.filter((c) => c.status === "published").length,
        thisMonth: content.filter(
          (c) => c.status === "published" && isThisMonthISO(c.publishDate)
        ).length,
      },
      culture: {
        total: culture.length,
        thisMonth: culture.filter(
          (c) => c.status === "done" && isThisMonthISO(c.finishDate)
        ).length,
      },
    };
  }, [tasks, projects, ieltsMocks, content, culture]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-2xs text-muted uppercase tracking-widest mb-1">
            {dateLabel}
          </div>
          <Tooltip
            content="5 秒看清今日重点。本页只做轻量汇总，复杂编辑请进入对应工具。"
            placement="bottom"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-primary cursor-help">
              每日启动页
            </h2>
          </Tooltip>
        </div>
        <AIAssistButton
          type="today-summary"
          ctx={{ tasks }}
          label="生成今日摘要"
          onAdopt={(c) => {
            // 写入剪贴板或备注：MVP 阶段仅 alert 展示，未来可保存为 note
            navigator.clipboard?.writeText(c).catch(() => {});
            alert("今日摘要已生成并复制到剪贴板，可粘贴到笔记中使用。");
          }}
        />
      </div>

      {/* 今日优先 + 风险提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="今日优先处理"
            subtitle={`共 ${priorities.length} 项重点`}
            action={
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTaskFormOpen(true)}
                  aria-label="新建待办"
                  title="新建待办"
                >
                  <Plus size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/tasks")}
                >
                  查看全部 <ArrowRight size={12} />
                </Button>
              </div>
            }
          />
          <CardBody className="p-0">
            {priorities.length === 0 ? (
              <button
                type="button"
                onClick={() => setTaskFormOpen(true)}
                className="w-full px-4 py-10 text-center text-sm text-tertiary hover:bg-hover hover:text-secondary cursor-pointer transition-colors"
                title="点击新建待办"
              >
                <CheckSquare size={20} className="mx-auto mb-2 opacity-50" />
                今日无重点事项。适合推进长期项目。
                <span className="mt-2 flex items-center justify-center gap-1 text-2xs text-muted">
                  <Plus size={12} />
                  点击新建待办
                </span>
              </button>
            ) : (
              <ul className="divide-app">
                {priorities.map((t) => (
                  <li
                    key={t.id}
                    className="px-4 py-2.5 flex items-center gap-3 hover:bg-hover cursor-pointer transition-colors"
                    onClick={() => navigate("/tasks")}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        PRIORITY_DOT[t.priority]
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-primary truncate">
                        {t.title}
                      </div>
                      <div className="text-2xs text-muted mt-0.5">
                        {TASK_MODULE_LABELS[t.module]} · {PRIORITY_LABELS[t.priority]}
                        {t.dueDate && ` · ${fmtRelative(t.dueDate)}`}
                      </div>
                    </div>
                    {isOverdue(t.dueDate) && (
                      <Badge tone="danger">逾期</Badge>
                    )}
                    {isDueToday(t.dueDate) && (
                      <Badge tone="warning">今日</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="风险提醒" subtitle={`${risks.length} 条提醒`} />
          <CardBody className="p-0">
            {risks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-tertiary">
                <TrendingUp size={20} className="mx-auto mb-2 opacity-50" />
                暂无风险。状态良好。
              </div>
            ) : (
              <ul className="divide-app">
                {risks.map((r, i) => (
                  <li
                    key={i}
                    className="px-4 py-3 flex items-center gap-2.5 hover:bg-hover cursor-pointer transition-colors"
                    onClick={r.onClick}
                  >
                    <AlertTriangle
                      size={14}
                      className={
                        r.tone === "danger"
                          ? "text-danger"
                          : r.tone === "warning"
                          ? "text-warning"
                          : "text-muted"
                      }
                    />
                    <span className="text-sm text-secondary flex-1">
                      {r.text}
                    </span>
                    <ArrowRight size={12} className="text-muted" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* 本周概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="今日完成"
          value={`${weekStats.todayDone} / ${weekStats.todayTotal || 0}`}
          hint="今日到期任务完成情况"
          progress={weekStats.todayRate}
          progressTone="blue"
          valueTone="blue"
        />
        <StatCard
          label="本周完成"
          value={`${weekStats.doneCount} / ${weekStats.dueCount || 0}`}
          hint="本周到期任务完成情况"
          progress={weekStats.weekRate}
        />
        <StatCard
          label="进行中项目"
          value={String(moduleStats.projects.doing)}
          hint={`共 ${moduleStats.projects.total} 个项目`}
        />
        <StatCard
          label="本月积累"
          value={String(moduleStats.culture.thisMonth)}
          hint={`共 ${moduleStats.culture.total} 条积累`}
        />
      </div>

      {/* 快速新增入口 */}
      <Card>
        <CardHeader title="快速新增" subtitle="待办可直接创建，其他内容进入对应工具" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <QuickAdd
              icon={<CheckSquare size={16} />}
              label="新建待办"
              onClick={() => setTaskFormOpen(true)}
            />
            <QuickAdd
              icon={<KanbanSquare size={16} />}
              label="新建项目"
              onClick={() => navigate("/projects?new=1")}
            />
            <QuickAdd
              icon={<GraduationCap size={16} />}
              label="雅思打卡"
              onClick={() => navigate("/ielts?tab=checkin&new=1")}
            />
            <QuickAdd
              icon={<Radio size={16} />}
              label="自媒体选题"
              onClick={() => navigate("/media?new=1")}
            />
            <QuickAdd
              icon={<BookOpen size={16} />}
              label="记录积累"
              onClick={() => navigate("/culture?new=1")}
            />
          </div>
        </CardBody>
      </Card>

      {/* 兜底占位 */}
      <div className="h-8" />

      <TaskForm
        open={taskFormOpen}
        task={null}
        onClose={() => setTaskFormOpen(false)}
      />
    </div>
  );
}

function byPriority(a: Task, b: Task) {
  const order = { urgent: 4, high: 3, medium: 2, low: 1 };
  return order[b.priority] - order[a.priority];
}

function StatCard({
  label,
  value,
  hint,
  progress,
  progressTone,
  valueTone,
}: {
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  progressTone?: "neutral" | "silver" | "blue";
  valueTone?: "default" | "blue";
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-2xs text-muted uppercase tracking-wider mb-1">
          {label}
        </div>
        <div
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums",
            valueTone === "blue" ? "text-brand" : "text-primary"
          )}
        >
          {value}
        </div>
        {hint && <div className="text-2xs text-tertiary mt-1">{hint}</div>}
        {progress !== undefined && (
          <ProgressBar
            value={progress}
            className="mt-2.5"
            tone={progressTone}
          />
        )}
      </CardBody>
    </Card>
  );
}

function QuickAdd({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center justify-center gap-2 p-4 rounded-lg",
        "border border-default bg-elevated hover:bg-brand-soft hover:border-brand-border transition-colors",
        "text-secondary hover:text-primary"
      )}
    >
      <div className="w-9 h-9 rounded-full bg-surface border border-default flex items-center justify-center group-hover:text-brand group-hover:border-brand-border transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
      <Plus size={12} className="text-muted group-hover:text-brand transition-colors" />
    </button>
  );
}
