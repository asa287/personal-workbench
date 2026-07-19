import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Target, CalendarClock, Flag, NotebookPen } from "lucide-react";
import { useIELTSStore, SKILL_LABELS } from "@/stores/useIELTSStore";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IELTS_SKILL_LABELS } from "@/lib/labels";
import { fmtFullDate, daysUntil } from "@/lib/date";
import { todayISODate } from "@/lib/id";
import { genId } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { IELTSPlan, IELTSSkill } from "@/types";

const SKILLS: IELTSSkill[] = ["listening", "reading", "writing", "speaking"];

interface FormState {
  targetScore: string;
  examDate: string;
  weaknesses: IELTSSkill[];
  startDate: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    targetScore: "7",
    examDate: "",
    weaknesses: [],
    startDate: todayISODate(),
    note: "",
  };
}

function planToForm(p: IELTSPlan): FormState {
  return {
    targetScore: String(p.targetScore),
    examDate: p.examDate ?? "",
    weaknesses: [...p.weaknesses],
    startDate: p.startDate,
    note: p.note ?? "",
  };
}

export default function PlanTab() {
  const plans = useIELTSStore((s) => s.plans);
  const upsertPlan = useIELTSStore((s) => s.upsertPlan);
  const deletePlan = useIELTSStore((s) => s.deletePlan);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IELTSPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<IELTSPlan | null>(null);

  // 当前活跃计划：取 startDate 最新的一条
  const currentPlan = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) =>
      a.startDate < b.startDate ? 1 : -1
    )[0];
  }, [plans]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (p: IELTSPlan) => {
    setEditing(p);
    setForm(planToForm(p));
    setOpen(true);
  };

  const toggleWeakness = (s: IELTSSkill) => {
    setForm((f) => ({
      ...f,
      weaknesses: f.weaknesses.includes(s)
        ? f.weaknesses.filter((x) => x !== s)
        : [...f.weaknesses, s],
    }));
  };

  const valid = useMemo(() => {
    const score = Number(form.targetScore);
    return (
      Number.isFinite(score) &&
      score > 0 &&
      score <= 9 &&
      form.startDate.trim() !== ""
    );
  }, [form.targetScore, form.startDate]);

  const submit = () => {
    if (!valid) return;
    const payload: IELTSPlan = {
      id: editing?.id ?? genId("ielts-p"),
      targetScore: Number(form.targetScore),
      examDate: form.examDate.trim() || undefined,
      weaknesses: form.weaknesses,
      startDate: form.startDate,
      note: form.note.trim() || undefined,
    };
    upsertPlan(payload);
    setOpen(false);
  };

  if (!currentPlan) {
    return (
      <>
        <EmptyState
          icon={<Target size={20} />}
          title="还没有备考计划"
          description="设定目标分数、考试日期与薄弱项，开始系统化备考。"
          action={
            <Button variant="primary" size="md" onClick={openCreate}>
              <Plus size={14} /> 创建计划
            </Button>
          }
        />
        <PlanFormModal
          open={open}
          editing={editing}
          form={form}
          setForm={setForm}
          onToggleWeakness={toggleWeakness}
          valid={valid}
          onCancel={() => setOpen(false)}
          onSubmit={submit}
        />
      </>
    );
  }

  const examDays = currentPlan.examDate
    ? daysUntil(currentPlan.examDate)
    : null;

  return (
    <>
      <Card>
        <CardHeader
          title="当前备考计划"
          subtitle={`创建于 ${fmtFullDate(currentPlan.startDate)}`}
          action={
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(currentPlan)}>
                <Pencil size={13} /> 编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleting(currentPlan)}
                className="hover:text-danger"
              >
                <Trash2 size={13} /> 删除
              </Button>
            </>
          }
        />
        <CardBody className="space-y-4">
          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCell
              icon={<Target size={14} />}
              label="目标分数"
              value={currentPlan.targetScore.toFixed(1)}
            />
            <StatCell
              icon={<CalendarClock size={14} />}
              label="考试日期"
              value={currentPlan.examDate ? fmtFullDate(currentPlan.examDate) : "未设定"}
              hint={
                examDays === null
                  ? undefined
                  : examDays >= 0
                    ? `${examDays} 天后`
                    : `${Math.abs(examDays)} 天前`
              }
              hintTone={examDays !== null && examDays < 0 ? "danger" : undefined}
            />
            <StatCell
              icon={<Flag size={14} />}
              label="起始日期"
              value={fmtFullDate(currentPlan.startDate)}
            />
            <StatCell
              icon={<NotebookPen size={14} />}
              label="薄弱项"
              value={
                currentPlan.weaknesses.length
                  ? currentPlan.weaknesses.map((w) => IELTS_SKILL_LABELS[w]).join("、")
                  : "未设定"
              }
            />
          </div>

          {/* 薄弱项 chips */}
          {currentPlan.weaknesses.length > 0 && (
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-2">
                薄弱项分布
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => {
                  const active = currentPlan.weaknesses.includes(s);
                  return (
                    <Badge key={s} tone={active ? "silver" : "outline"}>
                      {IELTS_SKILL_LABELS[s]}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* 备注 */}
          {currentPlan.note && (
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-1.5">
                计划备注
              </div>
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {currentPlan.note}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <PlanFormModal
        open={open}
        editing={editing}
        form={form}
        setForm={setForm}
        onToggleWeakness={toggleWeakness}
        valid={valid}
        onCancel={() => setOpen(false)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={!!deleting}
        title="删除备考计划"
        message={
          deleting
            ? "确认删除当前备考计划？相关打卡 / 错题 / 模考记录会保留，但顶部状态将不再显示计划。"
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deletePlan(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function StatCell({
  icon,
  label,
  value,
  hint,
  hintTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "danger" | "warning";
}) {
  return (
    <div className="surface-card rounded-md p-3">
      <div className="flex items-center gap-1.5 text-2xs text-muted uppercase tracking-wider mb-1.5">
        <span className="text-silver-500">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-semibold text-primary truncate">{value}</div>
      {hint && (
        <div
          className={cn(
            "text-2xs mt-1",
            hintTone === "danger" ? "text-danger" : "text-tertiary"
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function PlanFormModal({
  open,
  editing,
  form,
  setForm,
  onToggleWeakness,
  valid,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  editing: IELTSPlan | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onToggleWeakness: (s: IELTSSkill) => void;
  valid: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={editing ? "编辑备考计划" : "创建备考计划"}
      description="同一时间仅保留一个活跃计划。"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" disabled={!valid} onClick={onSubmit}>
            {editing ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="目标分数" required hint="0 ~ 9，支持 0.5 分">
            <Input
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={form.targetScore}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetScore: e.target.value }))
              }
              invalid={Number(form.targetScore) <= 0 || Number(form.targetScore) > 9}
            />
          </Field>
          <Field label="起始日期" required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </Field>
        </div>

        <Field label="考试日期" hint="可选，用于计算倒计时">
          <Input
            type="date"
            value={form.examDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, examDate: e.target.value }))
            }
          />
        </Field>

        <Field label="薄弱项" hint="可多选，作为 AI 建议与重点训练依据">
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => {
              const active = form.weaknesses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleWeakness(s)}
                  className={cn(
                    "px-2.5 h-7 rounded-md text-xs font-medium border transition-colors",
                    active
                      ? "bg-silver-300/15 text-silver-700 dark:text-silver-300 border-silver-300/40"
                      : "border-default text-secondary hover:bg-hover"
                  )}
                >
                  {SKILL_LABELS[s]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="计划备注" hint="可选，如阶段重点、教材安排等">
          <Textarea
            rows={4}
            value={form.note}
            placeholder="例如：本月主攻写作 Task 2，每周 2 篇批改；周末做完整模考。"
            onChange={(e) =>
              setForm((f) => ({ ...f, note: e.target.value }))
            }
          />
        </Field>
      </div>
    </Modal>
  );
}
