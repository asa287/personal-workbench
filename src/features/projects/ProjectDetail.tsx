import { useState, useEffect } from "react";
import {
  Target,
  ListChecks,
  Link2,
  BookOpen,
  Award,
  Pencil,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { AIAssistButton } from "@/components/shared/AIAssistButton";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { Project } from "@/types";

export function ProjectDetail({
  open,
  project,
  onClose,
  onEdit,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onEdit: (p: Project) => void;
}) {
  const updateProject = useProjectStore((s) => s.updateProject);
  const tasks = useTaskStore((s) => s.tasks);
  const collections = useCollectionStore((s) => s.collections);

  // 作品集沉淀的内联编辑状态
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // 关闭时重置内联编辑状态
  useEffect(() => {
    if (!open) {
      setEditingNote(false);
      setNoteDraft("");
    }
  }, [open]);

  if (!project) return null;

  const relatedTasks = tasks.filter((t) =>
    project.relatedTaskIds.includes(t.id)
  );
  const isFinished = project.status === "done" || project.status === "archived";

  // 所属合集名（未归类或合集已删除时不显示）
  const collectionName = project.collectionId
    ? collections.find((c) => c.id === project.collectionId)?.name
    : undefined;

  const startEditNote = () => {
    setNoteDraft(project.portfolioNote ?? "");
    setEditingNote(true);
  };

  const saveNote = () => {
    updateProject(project.id, {
      portfolioNote: noteDraft.trim() || undefined,
    });
    setEditingNote(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project.name}
      description={
        <span className="inline-flex items-center gap-2">
          <Badge tone="silver">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          <span>更新于 {fmtDateTime(project.updatedAt)}</span>
        </span>
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* 顶部操作（编辑 / AI 包装） */}
        <div className="flex items-center justify-end gap-2 -mt-1">
          <AIAssistButton
            type="project-wrap"
            ctx={{ project }}
            onAdopt={(content) =>
              updateProject(project.id, { portfolioNote: content })
            }
            label="AI 包装"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => onEdit(project)}
          >
            <Pencil size={14} /> 编辑
          </Button>
        </div>

        {/* 基本信息 */}
        <section>
          <SectionTitle icon={<Target size={14} />} title="基本信息" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <InfoRow label="目标" value={project.goal || "—"} />
            <InfoRow label="角色" value={project.role || "—"} />
            <InfoRow label="开始日期" value={fmtDate(project.startDate)} />
            <InfoRow label="结束日期" value={fmtDate(project.endDate)} />
            {collectionName && (
              <InfoRow label="所属合集" value={collectionName} />
            )}
          </div>
        </section>

        {/* 关键成果 */}
        <section>
          <SectionTitle icon={<ListChecks size={14} />} title="关键成果" />
          {project.keyResults.length ? (
            <ul className="mt-3 space-y-1.5">
              {project.keyResults.map((kr, i) => (
                <li
                  key={i}
                  className="text-sm text-secondary flex gap-2 leading-relaxed"
                >
                  <span className="text-muted shrink-0 font-mono">
                    {i + 1}.
                  </span>
                  <span>{kr}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted mt-3">暂无关键成果</p>
          )}
        </section>

        {/* 关联任务 */}
        <section>
          <SectionTitle
            icon={<ListChecks size={14} />}
            title={`关联任务（${relatedTasks.length}）`}
          />
          {relatedTasks.length ? (
            <ul className="mt-3 space-y-1.5">
              {relatedTasks.map((t) => (
                <li
                  key={t.id}
                  className="text-sm text-secondary flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "w-1 h-1 rounded-full shrink-0",
                      t.status === "done" ? "bg-neutral-400" : "bg-silver-500"
                    )}
                  />
                  <span
                    className={cn(
                      "truncate",
                      t.status === "done" && "line-through text-muted"
                    )}
                  >
                    {t.title}
                  </span>
                  <Badge tone="outline" className="ml-auto shrink-0">
                    {TASK_STATUS_LABELS[t.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted mt-3">暂无关联任务</p>
          )}
        </section>

        {/* 素材链接 */}
        <section>
          <SectionTitle icon={<Link2 size={14} />} title="素材链接" />
          {project.materialLinks.length ? (
            <ul className="mt-3 space-y-1">
              {project.materialLinks.map((l, i) => (
                <li key={i}>
                  <a
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-secondary hover:text-primary underline truncate block"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted mt-3">暂无素材链接</p>
          )}
        </section>

        {/* 复盘 */}
        <section>
          <SectionTitle icon={<BookOpen size={14} />} title="复盘" />
          {project.review ? (
            <p className="text-sm text-secondary mt-3 leading-relaxed whitespace-pre-wrap">
              {project.review}
            </p>
          ) : (
            <p className="text-xs text-muted mt-3">暂未填写复盘</p>
          )}
        </section>

        {/* 作品集沉淀（仅 done/archived） */}
        {isFinished && (
          <section>
            <SectionTitle
              icon={<Award size={14} />}
              title="作品集沉淀"
              action={
                !editingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditNote}
                  >
                    <Pencil size={12} /> 编辑
                  </Button>
                )
              }
            />
            {editingNote ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={6}
                  placeholder="沉淀为可复用的作品集 / 简历素材…"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNote(false)}
                  >
                    取消
                  </Button>
                  <Button variant="primary" size="sm" onClick={saveNote}>
                    保存
                  </Button>
                </div>
              </div>
            ) : project.portfolioNote ? (
              <p className="text-sm text-secondary mt-3 leading-relaxed whitespace-pre-wrap">
                {project.portfolioNote}
              </p>
            ) : (
              <p className="text-xs text-muted mt-3">
                点击右上角「AI 包装」生成简历文案，或手动编辑
              </p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}

// 分块标题
function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-tertiary uppercase tracking-wider">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

// 信息行
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xs text-muted uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-sm text-primary leading-relaxed">{value}</div>
    </div>
  );
}
