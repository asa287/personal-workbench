import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
import { PanelLeftClose, PanelLeftOpen, GripVertical } from "lucide-react";
import { useToolStore } from "@/stores/useToolStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { TOOL_META, GROUP_LABELS, type ToolGroup } from "@/lib/tools";
import { cn } from "@/lib/cn";
import type { ToolId } from "@/types";

function SortableItem({ id }: { id: ToolId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const meta = TOOL_META[id];
  const Icon = meta.icon;
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group relative"
    >
      <NavLink
        to={meta.path}
        end={meta.path === "/"}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm transition-colors relative",
            collapsed && "justify-center px-0",
            isActive
              ? "bg-brand-soft text-primary border border-brand-border"
              : "text-secondary hover:text-primary hover:bg-hover border border-transparent"
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-brand"
              />
            )}
            <Icon
              size={16}
              className={cn("shrink-0", isActive && "text-brand")}
            />
            {!collapsed && <span className="truncate flex-1">{meta.name}</span>}
          </>
        )}
      </NavLink>
      {!collapsed && (
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted hover:text-primary cursor-grab active:cursor-grabbing p-1"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>
      )}
    </div>
  );
}

export function Sidebar() {
  const tools = useToolStore((s) => s.tools);
  const reorder = useToolStore((s) => s.reorder);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const location = useLocation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const visibleTools = tools
    .filter((t) => t.visible)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);

  // 按分组拆分：dashboard 独立置顶，其余按 ToolMeta.group 分组
  const groups: { group: ToolGroup; ids: ToolId[] }[] = (
    ["urgent", "longterm"] as ToolGroup[]
  ).map((group) => ({
    group,
    ids: visibleTools.filter((id) => TOOL_META[id].group === group),
  }));

  const handleDragEnd = (e: DragEndEvent, groupId: ToolGroup) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const groupIds = groups.find((g) => g.group === groupId)?.ids ?? [];
    const oldIdx = groupIds.indexOf(active.id as ToolId);
    const newIdx = groupIds.indexOf(over.id as ToolId);
    if (oldIdx === -1 || newIdx === -1) return;
    // 拖拽只在组内生效；组间顺序通过整组拼接保持
    const reordered = arrayMove(groupIds, oldIdx, newIdx);
    const next: ToolId[] = [];
    groups.forEach((g) => {
      if (g.group === groupId) next.push(...reordered);
      else next.push(...g.ids);
    });
    reorder(next);
  };

  // 快捷键 Cmd/Ctrl + B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  return (
    <>
      {/* 桌面 / 平板侧边栏 */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 bg-surface border-r border-default transition-[width] duration-200 ease-out",
          collapsed ? "w-[60px]" : "w-[232px]"
        )}
      >
        {/* Logo 区 */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-default",
            collapsed ? "justify-center px-2" : "px-4 gap-2.5"
          )}
        >
          <div className="w-6 h-6 rounded bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center shrink-0">
            <div className="flex gap-[2px]">
              <div className="w-[3px] h-3 bg-silver-300 rounded-sm" />
              <div className="w-[3px] h-3 bg-silver-500 rounded-sm" />
              <div className="w-[3px] h-3 bg-silver-300 rounded-sm" />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-primary truncate">
                个人工作台
              </div>
              <div className="text-2xs text-muted truncate">
                Personal Workbench
              </div>
            </div>
          )}
        </div>

        {/* 工具列表 */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* 每日启动页：独立置顶 */}
          <SortableItem id="dashboard" />

          {/* 分组渲染：即时推进 / 长期积累 */}
          {groups.map((g, idx) => {
            // 顶部组分隔线 + 组标题
            const showHeader = !collapsed && g.ids.length > 0;
            return (
              <div key={g.group} className="mt-2">
                {showHeader && (
                  <>
                    <div className="mx-1 my-1.5 border-t border-default" />
                    <div
                      className="px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-muted"
                      title={GROUP_LABELS[g.group]}
                    >
                      {GROUP_LABELS[g.group]}
                    </div>
                  </>
                )}
                {g.ids.length === 0 && showHeader && (
                  <p className="px-2.5 py-2 text-2xs text-muted leading-relaxed">
                    本组工具已全部隐藏
                  </p>
                )}
                {g.ids.length === 0 && !showHeader && idx === 0 && collapsed && (
                  <div className="mx-2 my-1.5 border-t border-default" />
                )}
                {g.ids.length > 0 && (
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
                        <SortableItem key={id} id={id} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            );
          })}

          {!collapsed && visibleTools.length <= 1 && (
            <p className="px-2.5 py-3 text-2xs text-muted leading-relaxed">
              所有工具已隐藏。前往「设置 → 工具管理」开启。
            </p>
          )}
        </nav>

        {/* 底部：收起按钮 */}
        <div className="p-2 border-t border-default">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "w-full flex items-center gap-2 h-8 px-2.5 rounded-md text-xs text-tertiary hover:text-primary hover:bg-hover transition-colors",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "展开工具栏" : "收起工具栏"}
          >
            {collapsed ? (
              <PanelLeftOpen size={14} />
            ) : (
              <>
                <PanelLeftClose size={14} />
                <span>收起</span>
                <span className="ml-auto text-2xs text-muted">⌘B</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 移动端底部 Tab */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-default flex items-stretch h-14 pb-[env(safe-area-inset-bottom)]">
        {(["dashboard", ...visibleTools.filter((i) => i !== "dashboard")] as ToolId[])
          .slice(0, 5)
          .map((id) => {
            const meta = TOOL_META[id];
            const Icon = meta.icon;
            const active =
              meta.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(meta.path);
            return (
              <NavLink
                key={id}
                to={meta.path}
                end={meta.path === "/"}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-2xs transition-colors",
                  active ? "text-brand" : "text-muted"
                )}
              >
                <Icon size={18} />
                <span>{meta.shortName}</span>
              </NavLink>
            );
          })}
      </nav>
    </>
  );
}
