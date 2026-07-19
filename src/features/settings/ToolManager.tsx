import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw } from "lucide-react";
import { useToolStore } from "@/stores/useToolStore";
import { TOOL_META, GROUP_LABELS, type ToolGroup } from "@/lib/tools";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type { ToolId } from "@/types";

// 内联 Switch 组件：黑白灰风格的小开关
function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
        checked
          ? "bg-neutral-700 dark:bg-neutral-300"
          : "bg-neutral-200 dark:bg-neutral-800",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

// 单行工具：拖拽手柄 + 图标 + 名称/描述 + 显隐开关
function SortableToolRow({ id }: { id: ToolId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const meta = TOOL_META[id];
  const Icon = meta.icon;
  const tools = useToolStore((s) => s.tools);
  const setVisible = useToolStore((s) => s.setVisible);

  // dashboard 不在 store.tools 中，按固定可见处理
  const tool = tools.find((t) => t.id === id);
  const visible = tool ? tool.visible : true;
  const fixed = !!meta.fixed;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group flex items-center gap-3 px-3 py-2.5 border-b border-default last:border-b-0 hover:bg-hover transition-colors"
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        aria-label="拖拽排序"
        disabled={fixed}
        {...attributes}
        {...listeners}
        className={cn(
          "shrink-0 p-0.5 text-muted hover:text-primary transition-colors",
          fixed
            ? "opacity-30 cursor-not-allowed"
            : "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical size={14} />
      </button>

      {/* 图标 */}
      <div className="w-7 h-7 shrink-0 rounded-md bg-elevated border border-default flex items-center justify-center text-secondary">
        <Icon size={15} />
      </div>

      {/* 名称 + 描述 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-primary font-medium truncate">
            {meta.name}
          </span>
          {fixed && <Badge tone="neutral">固定</Badge>}
          {!visible && !fixed && <Badge tone="outline">已隐藏</Badge>}
        </div>
        <div className="text-2xs text-tertiary mt-0.5 truncate">
          {meta.description}
        </div>
      </div>

      {/* 显隐开关 */}
      <Switch
        checked={visible}
        onChange={(v) => setVisible(id, v)}
        disabled={fixed}
      />
    </div>
  );
}

export function ToolManager() {
  const tools = useToolStore((s) => s.tools);
  const reorder = useToolStore((s) => s.reorder);
  const reset = useToolStore((s) => s.reset);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // dashboard 固定在顶部，其余按 order 升序、按 ToolMeta.group 分组
  const dashboardId: ToolId = "dashboard";
  const sortedAll = [...tools].sort((a, b) => a.order - b.order);
  const grouped: { group: ToolGroup; ids: ToolId[] }[] = (
    ["urgent", "longterm"] as ToolGroup[]
  ).map((group) => ({
    group,
    ids: sortedAll
      .filter((t) => TOOL_META[t.id].group === group)
      .map((t) => t.id),
  }));

  const handleDragEnd = (e: DragEndEvent, groupId: ToolGroup) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const groupIds = grouped.find((g) => g.group === groupId)?.ids ?? [];
    const oldIdx = groupIds.indexOf(active.id as ToolId);
    const newIdx = groupIds.indexOf(over.id as ToolId);
    if (oldIdx === -1 || newIdx === -1) return;
    // 仅组内排序：拼接重组后整体 reorder
    const reordered = arrayMove(groupIds, oldIdx, newIdx);
    const next: ToolId[] = [];
    grouped.forEach((g) => {
      if (g.group === groupId) next.push(...reordered);
      else next.push(...g.ids);
    });
    reorder(next);
  };

  return (
    <Card>
      <CardHeader
        title="工具管理"
        subtitle="拖拽排序、显隐切换；首页固定不可调整；分组按工具性质划分"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw size={12} /> 恢复默认
          </Button>
        }
      />
      <CardBody className="p-0">
        {/* 固定项：dashboard */}
        <SortableToolRow id={dashboardId} />

        {/* 分组渲染 */}
        {grouped.map((g) => (
          <div key={g.group}>
            <div className="px-4 py-2 border-t border-default bg-elevated/40">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">
                {GROUP_LABELS[g.group]}
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, g.group)}
            >
              <SortableContext
                items={g.ids}
                strategy={verticalListSortingStrategy}
              >
                {g.ids.map((id) => (
                  <SortableToolRow key={id} id={id} />
                ))}
              </SortableContext>
            </DndContext>
            {g.ids.length === 0 && (
              <div className="px-4 py-3 text-2xs text-muted">
                本组工具已全部隐藏
              </div>
            )}
          </div>
        ))}
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        title="恢复默认"
        message="将重置工具顺序与可见性为默认状态，确认继续？"
        confirmText="恢复"
        onConfirm={() => {
          reset();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
