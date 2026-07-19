import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, AlertCircle, Layers, Clock } from "lucide-react";
import { useIELTSStore, SKILL_LABELS } from "@/stores/useIELTSStore";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Segmented } from "@/components/ui/Segmented";
import { ERROR_REVIEW_LABELS, IELTS_SKILL_LABELS } from "@/lib/labels";
import { fmtFullDate } from "@/lib/date";
import { todayISODate } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { IELTSError, IELTSSkill, ErrorReviewStatus } from "@/types";

const SKILLS: IELTSSkill[] = ["listening", "reading", "writing", "speaking"];
const STATUSES: ErrorReviewStatus[] = ["new", "reviewing", "mastered"];

type GroupMode = "skill" | "date";

interface FormState {
  date: string;
  skill: IELTSSkill;
  question: string;
  reason: string;
  reviewStatus: ErrorReviewStatus;
}

function emptyForm(): FormState {
  return {
    date: todayISODate(),
    skill: "listening",
    question: "",
    reason: "",
    reviewStatus: "new",
  };
}

function errorToForm(e: IELTSError): FormState {
  return {
    date: e.date,
    skill: e.skill,
    question: e.question,
    reason: e.reason ?? "",
    reviewStatus: e.reviewStatus,
  };
}

export default function ErrorsTab({ newSignal }: { newSignal: number }) {
  const errors = useIELTSStore((s) => s.errors);
  const addError = useIELTSStore((s) => s.addError);
  const updateError = useIELTSStore((s) => s.updateError);
  const setErrorReviewStatus = useIELTSStore((s) => s.setErrorReviewStatus);
  const deleteError = useIELTSStore((s) => s.deleteError);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IELTSError | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<IELTSError | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("skill");

  // 外部触发新建（?new=1）
  useEffect(() => {
    if (newSignal > 0) {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSignal]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (e: IELTSError) => {
    setEditing(e);
    setForm(errorToForm(e));
    setOpen(true);
  };

  const valid = useMemo(
    () => form.date.trim() !== "" && form.question.trim() !== "",
    [form.date, form.question]
  );

  const submit = () => {
    if (!valid) return;
    const payload = {
      date: form.date,
      skill: form.skill,
      question: form.question.trim(),
      reason: form.reason.trim() || undefined,
      reviewStatus: form.reviewStatus,
    };
    if (editing) {
      updateError(editing.id, payload);
    } else {
      addError(payload);
    }
    setOpen(false);
  };

  // 分组：按 skill 或按日期倒序
  const groups = useMemo(() => {
    if (groupMode === "date") {
      const sorted = [...errors].sort((a, b) => (a.date < b.date ? 1 : -1));
      return [{ key: "全部", label: "按日期倒序", items: sorted }];
    }
    // 按 skill 分组
    const map = new Map<IELTSSkill, IELTSError[]>();
    SKILLS.forEach((s) => map.set(s, []));
    [...errors]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .forEach((e) => {
        map.get(e.skill)?.push(e);
      });
    return SKILLS.filter((s) => (map.get(s)?.length ?? 0) > 0).map((s) => ({
      key: s,
      label: IELTS_SKILL_LABELS[s],
      items: map.get(s)!,
    }));
  }, [errors, groupMode]);

  // 状态汇总
  const stats = useMemo(() => {
    const by: Record<ErrorReviewStatus, number> = {
      new: 0,
      reviewing: 0,
      mastered: 0,
    };
    errors.forEach((e) => {
      by[e.reviewStatus] += 1;
    });
    return by;
  }, [errors]);

  return (
    <>
      {/* 状态汇总 + 分组切换 */}
      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    s === "new" && "bg-silver-500",
                    s === "reviewing" && "bg-silver-300",
                    s === "mastered" && "bg-neutral-400"
                  )}
                />
                <span className="text-2xs text-muted">
                  {ERROR_REVIEW_LABELS[s]}
                </span>
                <span className="font-mono text-sm text-primary tabular-nums">
                  {stats[s]}
                </span>
              </div>
            ))}
          </div>
          <Segmented
            size="sm"
            value={groupMode}
            onChange={(v) => setGroupMode(v as GroupMode)}
            options={[
              { value: "skill", label: "按科目", icon: <Layers size={12} /> },
              { value: "date", label: "按日期", icon: <Clock size={12} /> },
            ]}
          />
        </CardBody>
      </Card>

      {/* 工具栏 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
          错题本
          <span className="ml-1.5 text-muted">{errors.length}</span>
        </h3>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={14} /> 新建错题
        </Button>
      </div>

      {/* 列表 */}
      {errors.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={20} />}
          title="还没有错题记录"
          description="把做错的题目与原因记录下来，配合复习状态持续追踪。"
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
                  {g.label}
                </h4>
                <span className="text-2xs text-muted">{g.items.length}</span>
                <div className="flex-1 h-px bg-[var(--border-default)]" />
              </div>
              <div className="space-y-1.5">
                {g.items.map((e) => (
                  <ErrorRow
                    key={e.id}
                    error={e}
                    onStatusChange={(s) => setErrorReviewStatus(e.id, s)}
                    onEdit={() => openEdit(e)}
                    onDelete={() => setDeleting(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 表单 */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑错题" : "新建错题"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button variant="primary" disabled={!valid} onClick={submit}>
              {editing ? "保存" : "创建"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
            <Field label="科目" required>
              <Select
                value={form.skill}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    skill: e.target.value as IELTSSkill,
                  }))
                }
              >
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {IELTS_SKILL_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="题目" required hint="原题或简述">
            <Textarea
              rows={3}
              value={form.question}
              placeholder="例如：Cam18 Test1 S3 Q21，配对题选错。"
              onChange={(e) =>
                setForm((f) => ({ ...f, question: e.target.value }))
              }
            />
          </Field>

          <Field label="错因分析" hint="可选，记录为什么错">
            <Textarea
              rows={3}
              value={form.reason}
              placeholder="例如：未捕捉到转折词 however，误选干扰项。"
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
            />
          </Field>

          <Field label="复习状态">
            <Select
              value={form.reviewStatus}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reviewStatus: e.target.value as ErrorReviewStatus,
                }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ERROR_REVIEW_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="删除错题"
        message={
          deleting
            ? `确认删除 ${fmtFullDate(deleting.date)} 的错题记录？`
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteError(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function ErrorRow({
  error,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  error: IELTSError;
  onStatusChange: (s: ErrorReviewStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 rounded-md border border-default bg-surface hover:bg-hover transition-colors">
      <div className="shrink-0 w-16">
        <div className="text-sm font-medium text-primary">
          {fmtFullDate(error.date).slice(5)}
        </div>
        <Badge tone="outline" className="mt-1">
          {SKILL_LABELS[error.skill]}
        </Badge>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-primary leading-snug line-clamp-2">
          {error.question}
        </p>
        {error.reason && (
          <p className="text-2xs text-tertiary mt-1 line-clamp-2">
            <span className="text-muted">错因：</span>
            {error.reason}
          </p>
        )}
        {/* 快速切换复习状态 */}
        <div className="mt-2 inline-flex items-center p-0.5 bg-elevated border border-default rounded gap-0.5">
          {STATUSES.map((s) => {
            const active = error.reviewStatus === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(s)}
                className={cn(
                  "h-6 px-2 rounded text-2xs font-medium transition-colors",
                  active
                    ? "bg-surface text-primary shadow-float border border-default"
                    : "text-tertiary hover:text-primary"
                )}
              >
                {ERROR_REVIEW_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
