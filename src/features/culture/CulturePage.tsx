import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Library, LayoutGrid, List } from "lucide-react";
import { useCultureStore } from "@/stores/useCultureStore";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { AIAssistButton } from "@/components/shared/AIAssistButton";
import { CULTURE_TAB_LABELS, CULTURE_STATUS_LABELS } from "@/lib/labels";
import { isThisMonthISO } from "@/lib/date";
import type { CultureType, CultureStatus, CultureItem } from "@/types";
import { CultureList } from "./CultureList";
import { CultureDetail } from "./CultureDetail";
import { CultureForm } from "./CultureForm";
import { CultureGrid } from "./CultureGrid";

// 顶部 Tab 类型顺序
const TAB_TYPES: CultureType[] = [
  "book",
  "movie",
  "tv",
  "podcast",
  "article",
  "other",
];

// 简易响应式判断：md 断点（768px）以下视为移动端
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

export default function CulturePage() {
  const items = useCultureStore((s) => s.items);
  const [params, setParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<CultureStatus | "all">("all");

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  // 详情 Modal：移动端列表点击 / 网格视图点击均以 Modal 展示
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<CultureItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // 从 URL 同步当前 Tab 类型（默认 book）
  const typeParam = params.get("type");
  const activeType: CultureType =
    TAB_TYPES.includes(typeParam as CultureType) ? (typeParam as CultureType) : "book";

  // 视图模式：仅 movie/tv 支持网格；其他类型固定列表
  const isGridType = activeType === "movie" || activeType === "tv";
  const viewParam = params.get("view");
  const viewMode: "grid" | "list" = isGridType
    ? viewParam === "list"
      ? "list"
      : "grid"
    : "list";

  // 从 URL 同步 ?new=1，自动打开新建表单
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // 切换 Tab / 视图时关闭详情 Modal，避免上下文错位
  useEffect(() => {
    setDetailOpen(false);
  }, [activeType, viewMode]);

  // 顶部统计：本月完成数 + 累计素材数
  const stats = useMemo(() => {
    const monthDone = items.filter(
      (i) => i.status === "done" && isThisMonthISO(i.finishDate)
    ).length;
    const materialCount = items.filter(
      (i) => i.reusableMaterial || i.excerpts.some((e) => e.isMaterial)
    ).length;
    return { monthDone, materialCount };
  }, [items]);

  // 当前类型下的全部条目（供 AI 整理，忽略搜索 / 状态筛选）
  const typeItems = useMemo(
    () => items.filter((i) => i.type === activeType),
    [items, activeType]
  );

  // 筛选：当前 Tab 类型 + 状态 + 搜索（标题、作者、标签）
  const filtered = useMemo(() => {
    return typeItems.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (query) {
        const q = query.toLowerCase();
        const inTitle = i.title.toLowerCase().includes(q);
        const inCreator = (i.creator ?? "").toLowerCase().includes(q);
        const inTags = i.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inCreator && !inTags) return false;
      }
      return true;
    });
  }, [typeItems, filterStatus, query]);

  // 选中项：优先用户选择，否则回退到筛选结果首项
  const selected = useMemo(() => {
    if (selectedId) {
      const f = filtered.find((i) => i.id === selectedId);
      if (f) return f;
    }
    return filtered[0];
  }, [filtered, selectedId]);

  // 选中项不在筛选结果中时重置，避免详情与列表不一致
  useEffect(() => {
    if (selectedId && !filtered.find((i) => i.id === selectedId)) {
      setSelectedId(filtered[0]?.id);
    } else if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: CultureItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSelect = (i: CultureItem) => {
    setSelectedId(i.id);
    // 移动端列表点击 / 网格视图点击：以 Modal 展示详情
    if (isMobile || viewMode === "grid") setDetailOpen(true);
  };

  // 切换 Tab：同步 URL；进入 movie/tv 默认网格，离开时清掉 view
  const setTabType = (t: CultureType) => {
    const next = new URLSearchParams(params);
    next.set("type", t);
    if (t === "movie" || t === "tv") {
      next.set("view", "grid");
    } else {
      next.delete("view");
    }
    setParams(next, { replace: true });
  };

  const setViewMode = (v: "grid" | "list") => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    setParams(next, { replace: true });
  };

  // 是否走网格视图（movie/tv 且 viewMode=grid）
  const showGrid = viewMode === "grid" && isGridType;

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      {/* 顶部统计 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="surface-card rounded-lg p-4">
          <div className="text-2xs text-muted uppercase tracking-wider mb-1">
            本月完成
          </div>
          <div className="font-mono text-2xl text-primary tabular-nums">
            {stats.monthDone}
          </div>
        </div>
        <div className="surface-card rounded-lg p-4">
          <div className="text-2xs text-muted uppercase tracking-wider mb-1">
            累计素材
          </div>
          <div className="font-mono text-2xl text-primary tabular-nums">
            {stats.materialCount}
          </div>
        </div>
      </div>

      {/* 类型 Tab */}
      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={activeType}
          onChange={(t) => setTabType(t)}
          options={TAB_TYPES.map((t) => ({
            value: t,
            label: CULTURE_TAB_LABELS[t],
          }))}
        />
      </div>

      {/* 工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            placeholder="搜索标题 / 作者 / 标签…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as CultureStatus | "all")
          }
          className="w-auto"
        >
          <option value="all">全部状态</option>
          {(Object.keys(CULTURE_STATUS_LABELS) as CultureStatus[]).map((s) => (
            <option key={s} value={s}>
              {CULTURE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        {/* movie/tv 视图切换 */}
        {isGridType && (
          <Segmented
            size="sm"
            value={viewMode}
            onChange={(v) => setViewMode(v)}
            options={[
              { value: "grid", label: "网格", icon: <LayoutGrid size={14} /> },
              { value: "list", label: "列表", icon: <List size={14} /> },
            ]}
          />
        )}
        <AIAssistButton
          type="culture-organize"
          ctx={{ culture: typeItems }}
          label="AI 整理素材"
          onAdopt={() => {
            // AI 输出为整理草稿，提示用户落入对应字段后保存
            window.alert(
              "已采纳 AI 整理草稿。请将其复制到对应积累条目的「备注」或「个人观点」中保存。"
            );
          }}
        />
        <Button variant="primary" size="md" onClick={openNew}>
          <Plus size={14} /> 新建
        </Button>
      </div>

      {/* 主体 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library size={20} />}
          title="暂无积累"
          description="记录读过的书、看过的电影、文章摘录，沉淀为可复用素材。"
          action={
            <Button variant="primary" size="md" onClick={openNew}>
              <Plus size={14} /> 新建积累
            </Button>
          }
        />
      ) : showGrid ? (
        // 网格视图：全宽海报网格，点击通过 Modal 查看详情
        <CultureGrid
          items={filtered}
          onSelect={handleSelect}
          selectedId={selectedId}
        />
      ) : (
        // 列表视图：桌面端左右分栏（列表 40% / 详情 60%）；移动端仅列表
        <div className="md:grid md:grid-cols-5 md:gap-4">
          <div className="md:col-span-2">
            <CultureList
              items={filtered}
              onSelect={handleSelect}
              selectedId={selectedId}
            />
          </div>
          <div className="hidden md:block md:col-span-3">
            {selected ? (
              <div className="surface-card rounded-lg p-4">
                <CultureDetail
                  item={selected}
                  onEdit={() => openEdit(selected)}
                />
              </div>
            ) : (
              <EmptyState
                icon={<Library size={20} />}
                title="选择左侧条目查看详情"
              />
            )}
          </div>
        </div>
      )}

      {/* 详情 Modal：移动端列表点击 / 网格视图点击 */}
      <Modal
        open={detailOpen && (isMobile || showGrid)}
        onClose={() => setDetailOpen(false)}
        title={selected?.title}
        size="lg"
      >
        {selected && (
          <CultureDetail
            item={selected}
            onEdit={() => {
              setDetailOpen(false);
              openEdit(selected);
            }}
          />
        )}
      </Modal>

      {/* 新建 / 编辑表单 */}
      <CultureForm
        open={formOpen}
        item={editing}
        defaultType={activeType}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
