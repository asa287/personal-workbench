import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { useProjectStore } from "@/stores/useProjectStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/lib/labels";
import { todayISODate } from "@/lib/id";
import type { Project, ProjectStatus } from "@/types";

// 表单内部状态
interface FormState {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  role: string;
  status: ProjectStatus;
  collectionId: string; // "" = 未归类
  review: string;
  portfolioNote: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  goal: "",
  startDate: todayISODate(),
  endDate: "",
  role: "",
  status: "idea",
  collectionId: "",
  review: "",
  portfolioNote: "",
};

export function ProjectForm({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const addProject = useProjectStore((s) => s.addProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const collections = useCollectionStore((s) => s.collections);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [keyResults, setKeyResults] = useState<string[]>([""]);
  const [materialLinks, setMaterialLinks] = useState<string[]>([""]);
  const [error, setError] = useState("");

  // 打开时同步初始值
  useEffect(() => {
    if (!open) return;
    setError("");
    if (project) {
      setForm({
        name: project.name,
        goal: project.goal,
        startDate: project.startDate,
        endDate: project.endDate ?? "",
        role: project.role,
        status: project.status,
        collectionId: project.collectionId ?? "",
        review: project.review ?? "",
        portfolioNote: project.portfolioNote ?? "",
      });
      setKeyResults(project.keyResults.length ? [...project.keyResults] : [""]);
      setMaterialLinks(
        project.materialLinks.length ? [...project.materialLinks] : [""]
      );
    } else {
      setForm(DEFAULT_FORM);
      setKeyResults([""]);
      setMaterialLinks([""]);
    }
  }, [open, project]);

  // 作品集沉淀仅在已完成/归档时显示
  const showPortfolio = form.status === "done" || form.status === "archived";

  const submit = () => {
    if (!form.name.trim()) {
      setError("项目名称不能为空");
      return;
    }
    const payload: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
      name: form.name.trim(),
      goal: form.goal.trim(),
      startDate: form.startDate || todayISODate(),
      endDate: form.endDate || undefined,
      role: form.role.trim(),
      keyResults: keyResults.map((k) => k.trim()).filter(Boolean),
      relatedTaskIds: project?.relatedTaskIds ?? [],
      materialLinks: materialLinks.map((l) => l.trim()).filter(Boolean),
      review: form.review.trim() || undefined,
      status: form.status,
      collectionId: form.collectionId || undefined,
    };
    // 仅在 done/archived 状态下写入 portfolioNote，其它状态保留原值不覆盖
    if (showPortfolio) {
      payload.portfolioNote = form.portfolioNote.trim() || undefined;
    }
    if (project) {
      updateProject(project.id, payload);
    } else {
      addProject(payload);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "编辑项目" : "新建项目"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={submit}>
            {project ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        <Field label="项目名称" required error={error}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例如：个人作品集网站"
            autoFocus
            invalid={!!error}
          />
        </Field>

        <Field label="目标" hint="这个项目要达成的核心目标">
          <Textarea
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            placeholder="用一句话描述目标…"
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="开始日期">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="结束日期">
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="角色">
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="例如：负责人 / 设计 / 全栈"
            />
          </Field>
          <Field label="状态">
            <Select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ProjectStatus })
              }
            >
              {PROJECT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="所属合集" hint="把项目归入一个合集，便于分组筛选">
          <Select
            value={form.collectionId}
            onChange={(e) =>
              setForm({ ...form, collectionId: e.target.value })
            }
          >
            <option value="">未归类</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="关键成果" hint="可量化的产出 / 里程碑">
          <DynamicListInput
            items={keyResults}
            onChange={setKeyResults}
            placeholder="例如：完成 3 篇技术文章"
          />
        </Field>

        <Field label="素材链接" hint="参考资料 / 文档 / 仓库地址">
          <DynamicListInput
            items={materialLinks}
            onChange={setMaterialLinks}
            placeholder="https://…"
          />
        </Field>

        <Field label="复盘" hint="项目结束后的反思与沉淀">
          <Textarea
            value={form.review}
            onChange={(e) => setForm({ ...form, review: e.target.value })}
            placeholder="做得好的 / 待改进的 / 下一步…"
            rows={3}
          />
        </Field>

        {showPortfolio && (
          <Field label="作品集沉淀" hint="可复用的简历 / 作品集素材">
            <Textarea
              value={form.portfolioNote}
              onChange={(e) =>
                setForm({ ...form, portfolioNote: e.target.value })
              }
              placeholder="沉淀为可复用的描述…"
              rows={3}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

// 动态字符串列表（关键成果、素材链接等多条输入）
function DynamicListInput({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([...items, ""]);
  };
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => remove(i)}
            className="text-muted hover:text-danger shrink-0"
            aria-label="删除该条"
          >
            <X size={14} />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={add}
        className="text-secondary"
      >
        <Plus size={12} /> 添加一条
      </Button>
    </div>
  );
}
