import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  FolderKanban,
  Calendar,
  ListChecks,
  GripVertical,
  Layers,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateTime, isThisMonthISO } from "@/lib/date";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/lib/labels";
import type { Project, ProjectStatus, Collection, Task } from "@/types";
import { ProjectForm } from "./ProjectForm";
import { ProjectDetail } from "./ProjectDetail";
import { CollectionManager, UNCATEGORIZED_COLOR } from "./CollectionManager";

// 合集筛选特殊值：未归类
const FILTER_UNCATEGORIZED = "__none__";

export default function ProjectsPage() {
  const projects = useProjectStore((s) => s.projects);
  const setStatus = useProjectStore((s) => s.setStatus);
  const tasks = useTaskStore((s) => s.tasks);
  const collections = useCollectionStore((s) => s.collections);

  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [collectionMgrOpen, setCollectionMgrOpen] = useState(false);

  // 拖拽传感器：移动距离阈值，避免与点击冲突
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // URL ?new=1 自动打开新建表单
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // 选中的合集被删除时，回退到「全部」
  useEffect(() => {
    if (
      collectionFilter &&
      collectionFilter !== FILTER_UNCATEGORIZED &&
      !collections.find((c) => c.id === collectionFilter)
    ) {
      setCollectionFilter(null);
    }
  }, [collections, collectionFilter]);

  // 按合集筛选后的项目
  const visibleProjects = useMemo(() => {
    if (collectionFilter === null) return projects;
    if (collectionFilter === FILTER_UNCATEGORIZED) {
      return projects.filter((p) => !p.collectionId);
    }
    return projects.filter((p) => p.collectionId === collectionFilter);
  }, [projects, collectionFilter]);

  // 按状态分组（基于筛选后的项目）
  const grouped = useMemo(() => {
    const map: Record<ProjectStatus, Project[]> = {
      idea: [],
      doing: [],
      paused: [],
      done: [],
      archived: [],
    };
    visibleProjects.forEach((p) => map[p.status].push(p));
    return map;
  }, [visibleProjects]);

  // 顶部统计：总数 + 本月新增
  const stats = useMemo(() => {
    const monthNew = projects.filter((p) =>
      isThisMonthISO(p.createdAt)
    ).length;
    return {
      total: projects.length,
      monthNew,
    };
  }, [projects]);

  // 每个合集的项目数（用于 pill bar）
  const countByCollection = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      if (p.collectionId) {
        map.set(p.collectionId, (map.get(p.collectionId) ?? 0) + 1);
      }
    });
    return map;
  }, [projects]);

  const uncategorizedCount = useMemo(
    () => projects.filter((p) => !p.collectionId).length,
    [projects]
  );

  // 每个项目的关联任务数（与 task store 交叉验证，避免脏数据）
  const taskCountByProject = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p) => {
      map[p.id] = tasks.filter((t) =>
        p.relatedTaskIds.includes(t.id)
      ).length;
    });
    return map;
  }, [projects, tasks]);

  // 当前查看的项目（从 store 派生，保证编辑后实时刷新）
  const detail = useMemo(
    () =>
      detailId
        ? projects.find((p) => p.id === detailId) ?? null
        : null,
    [detailId, projects]
  );

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setFormOpen(true);
  };

  // 拖拽结束：改状态
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const projectId = String(active.id);
    let targetStatus: ProjectStatus | null = null;
    // over.id 可能是行 id（status）或同行中另一张卡片的 id
    if (PROJECT_STATUS_ORDER.includes(over.id as ProjectStatus)) {
      targetStatus = over.id as ProjectStatus;
    } else {
      const target = projects.find((p) => p.id === over.id);
      if (target) targetStatus = target.status;
    }
    if (!targetStatus) return;
    const current = projects.find((p) => p.id === projectId);
    if (!current || current.status === targetStatus) return;
    setStatus(projectId, targetStatus);
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto">
      {/* 顶部统计 + 操作 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted uppercase tracking-wider">
            项目总数
          </span>
          <span className="font-mono text-sm text-primary tabular-nums">
            {stats.total}
          </span>
        </div>
        <div className="h-3 w-px bg-[var(--border-default)]" />
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted uppercase tracking-wider">
            本月新增
          </span>
          <span className="font-mono text-sm text-primary tabular-nums">
            {stats.monthNew}
          </span>
        </div>
        <div className="h-3 w-px bg-[var(--border-default)] hidden sm:block" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {PROJECT_STATUS_ORDER.map((s) => (
            <Badge key={s} tone="outline">
              {PROJECT_STATUS_LABELS[s]} {grouped[s].length}
            </Badge>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="primary" size="md" onClick={openNew}>
          <Plus size={14} /> 新建项目
        </Button>
      </div>

      {/* 合集筛选 pill bar */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <CollectionPill
          active={collectionFilter === null}
          onClick={() => setCollectionFilter(null)}
          label="全部"
          count={projects.length}
        />
        {collections.map((c) => (
          <CollectionPill
            key={c.id}
            active={collectionFilter === c.id}
            onClick={() => setCollectionFilter(c.id)}
            label={c.name}
            count={countByCollection.get(c.id) ?? 0}
            color={c.color}
          />
        ))}
        <CollectionPill
          active={collectionFilter === FILTER_UNCATEGORIZED}
          onClick={() => setCollectionFilter(FILTER_UNCATEGORIZED)}
          label="未归类"
          count={uncategorizedCount}
          color={UNCATEGORIZED_COLOR}
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollectionMgrOpen(true)}
        >
          <Layers size={14} /> 管理合集
        </Button>
      </div>

      {/* 看板 / 空状态 */}
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={20} />}
          title="暂无项目"
          description="点击右上角新建项目，开始管理你的想法与进行中的事项。"
          action={
            <Button variant="primary" size="md" onClick={openNew}>
              <Plus size={14} /> 新建项目
            </Button>
          }
        />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} />}
          title="该筛选下暂无项目"
          description="切换到其他合集，或在新建项目时选择该合集。"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-3">
            {PROJECT_STATUS_ORDER.map((status) => (
              <KanbanRow
                key={status}
                status={status}
                projects={grouped[status]}
                taskCountByProject={taskCountByProject}
                tasks={tasks}
                collections={collections}
                onCardClick={(p) => setDetailId(p.id)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* 详情 Modal（编辑后从 store 派生，自动刷新） */}
      <ProjectDetail
        open={!!detail}
        project={detail}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
      />

      {/* 新建/编辑 Modal（在详情之后渲染，确保层级在上） */}
      <ProjectForm
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
      />

      {/* 合集管理 Modal */}
      <CollectionManager
        open={collectionMgrOpen}
        onClose={() => setCollectionMgrOpen(false)}
      />
    </div>
  );
}

// 合集筛选 pill
function CollectionPill({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
        active
          ? "bg-brand-soft text-primary border-brand-border"
          : "border-default text-secondary hover:bg-hover"
      )}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{label}</span>
      <span className="text-2xs tabular-nums opacity-70">{count}</span>
    </button>
  );
}

// 看板行：每行一个状态，左 70% 卡片横向滚动 + 右 30% 统计面板
function KanbanRow({
  status,
  projects,
  taskCountByProject,
  tasks,
  collections,
  onCardClick,
}: {
  status: ProjectStatus;
  projects: Project[];
  taskCountByProject: Record<string, number>;
  tasks: Task[];
  collections: Collection[];
  onCardClick: (p: Project) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // 完成率：done/archived 为 100%；其他行基于该行项目关联任务的完成情况
  const completionRate = useMemo(() => {
    if (status === "done" || status === "archived") return 100;
    const rowTaskIds = new Set(projects.flatMap((p) => p.relatedTaskIds));
    const rowTasks = tasks.filter((t) => rowTaskIds.has(t.id));
    if (rowTasks.length === 0) return null;
    const doneCount = rowTasks.filter((t) => t.status === "done").length;
    return Math.round((doneCount / rowTasks.length) * 100);
  }, [status, projects, tasks]);

  // 该行项目按合集分组
  const collectionDist = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const key = p.collectionId ?? FILTER_UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [projects]);

  // 该行最近更新时间
  const latestUpdate = useMemo(() => {
    if (projects.length === 0) return null;
    return projects.reduce((max, p) =>
      p.updatedAt > max ? p.updatedAt : max, projects[0].updatedAt
    );
  }, [projects]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border transition-colors",
        isOver
          ? "border-brand-border bg-elevated"
          : "border-default bg-surface/40"
      )}
    >
      {/* 行头：状态名 + 数量 + 分隔线 */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-default">
        <h3 className="text-sm font-semibold text-primary">
          {PROJECT_STATUS_LABELS[status]}
        </h3>
        <Badge tone={isOver ? "silver" : "neutral"}>{projects.length}</Badge>
        <div className="flex-1 h-px bg-[var(--border-default)]" />
      </div>

      {/* 内容区：左 70% 卡片横向滚动 + 右 30% 统计面板 */}
      <div className="flex flex-col md:flex-row">
        {/* 左：卡片横向滚动 */}
        <div className="md:w-[70%] md:shrink-0">
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-2 overflow-x-auto p-3 min-h-[104px] scrollbar-none">
              {projects.map((p) => (
                <SortableCard
                  key={p.id}
                  project={p}
                  taskCount={taskCountByProject[p.id] ?? 0}
                  onClick={() => onCardClick(p)}
                />
              ))}
              {projects.length === 0 && (
                <div className="flex items-center justify-center w-full text-2xs text-muted py-6">
                  拖拽项目到此行
                </div>
              )}
            </div>
          </SortableContext>
        </div>

        {/* 右：统计面板 */}
        <div className="md:w-[30%] md:shrink-0 border-t md:border-t-0 md:border-l border-default p-3 space-y-2.5">
          {/* 项目数（大字） */}
          <div>
            <div className="text-2xs text-muted uppercase tracking-wider">
              项目数
            </div>
            <div className="text-2xl font-semibold text-primary tabular-nums leading-tight">
              {projects.length}
            </div>
          </div>

          {/* 完成率 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs text-muted uppercase tracking-wider">
              完成率
            </span>
            <span className="text-sm font-medium text-primary tabular-nums">
              {completionRate === null ? "—" : `${completionRate}%`}
            </span>
          </div>

          {/* 最近更新 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs text-muted uppercase tracking-wider">
              最近更新
            </span>
            <span className="text-2xs text-secondary tabular-nums">
              {latestUpdate ? fmtDateTime(latestUpdate) : "—"}
            </span>
          </div>

          {/* 合集分布 */}
          {collectionDist.size > 0 && (
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-1.5">
                合集分布
              </div>
              <div className="space-y-1">
                {[...collectionDist.entries()].map(([key, count]) => {
                  const coll =
                    key === FILTER_UNCATEGORIZED
                      ? null
                      : collections.find((c) => c.id === key);
                  const name = coll ? coll.name : "未归类";
                  const color = coll?.color ?? UNCATEGORIZED_COLOR;
                  return (
                    <div key={key} className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-2xs text-secondary truncate flex-1">
                        {name}
                      </span>
                      <span className="text-2xs text-muted tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 可拖拽卡片
function SortableCard({
  project,
  taskCount,
  onClick,
}: {
  project: Project;
  taskCount: number;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const dateRange = project.endDate
    ? `${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}`
    : `${fmtDate(project.startDate)} → 至今`;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group cursor-pointer select-none rounded-md border bg-surface p-3 transition-all w-[220px] shrink-0",
        "hover:border-strong hover:shadow-float",
        isDragging && "opacity-50 shadow-card border-strong"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-primary leading-snug line-clamp-2">
          {project.name}
        </h4>
        <GripVertical
          size={14}
          className="text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
        />
      </div>

      {project.role && (
        <div className="mt-1.5 text-2xs text-tertiary truncate">
          {project.role}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1 truncate">
          <Calendar size={10} />
          <span className="truncate">{dateRange}</span>
        </span>
        {taskCount > 0 && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <ListChecks size={10} />
            {taskCount}
          </span>
        )}
      </div>
    </div>
  );
}
