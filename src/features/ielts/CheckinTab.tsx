import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { useIELTSStore, SKILL_LABELS } from "@/stores/useIELTSStore";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IELTS_SKILL_LABELS } from "@/lib/labels";
import { fmtFullDate, isThisWeekISO } from "@/lib/date";
import { todayISODate } from "@/lib/id";
import type { IELTSCheckin, IELTSSkill } from "@/types";

const SKILLS: IELTSSkill[] = ["listening", "reading", "writing", "speaking"];

// 本周学习目标（小时），用于进度条参照
const WEEKLY_GOAL_HOURS = 20;

interface FormState {
  date: string;
  listeningHours: string;
  readingHours: string;
  writingHours: string;
  speakingHours: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    date: todayISODate(),
    listeningHours: "0",
    readingHours: "0",
    writingHours: "0",
    speakingHours: "0",
    note: "",
  };
}

function checkinToForm(c: IELTSCheckin): FormState {
  return {
    date: c.date,
    listeningHours: String(c.listeningHours),
    readingHours: String(c.readingHours),
    writingHours: String(c.writingHours),
    speakingHours: String(c.speakingHours),
    note: c.note ?? "",
  };
}

export default function CheckinTab({ newSignal }: { newSignal: number }) {
  const checkins = useIELTSStore((s) => s.checkins);
  const addCheckin = useIELTSStore((s) => s.addCheckin);
  const updateCheckin = useIELTSStore((s) => s.updateCheckin);
  const deleteCheckin = useIELTSStore((s) => s.deleteCheckin);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IELTSCheckin | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<IELTSCheckin | null>(null);

  // 外部触发新建（?new=1）
  useEffect(() => {
    if (newSignal > 0) {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSignal]);

  const sorted = useMemo(
    () => [...checkins].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [checkins]
  );

  // 本周累计学习时长（按 skill 分组）
  const weeklyStats = useMemo(() => {
    const week = checkins.filter((c) => isThisWeekISO(c.date));
    const bySkill: Record<IELTSSkill, number> = {
      listening: 0,
      reading: 0,
      writing: 0,
      speaking: 0,
    };
    let total = 0;
    week.forEach((c) => {
      bySkill.listening += c.listeningHours;
      bySkill.reading += c.readingHours;
      bySkill.writing += c.writingHours;
      bySkill.speaking += c.speakingHours;
      total +=
        c.listeningHours +
        c.readingHours +
        c.writingHours +
        c.speakingHours;
    });
    return { bySkill, total, count: week.length };
  }, [checkins]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (c: IELTSCheckin) => {
    setEditing(c);
    setForm(checkinToForm(c));
    setOpen(true);
  };

  const valid = useMemo(() => {
    const nums = [
      form.listeningHours,
      form.readingHours,
      form.writingHours,
      form.speakingHours,
    ].map(Number);
    return (
      form.date.trim() !== "" &&
      nums.every((n) => Number.isFinite(n) && n >= 0) &&
      nums.some((n) => n > 0)
    );
  }, [form]);

  const submit = () => {
    if (!valid) return;
    const payload = {
      date: form.date,
      listeningHours: Number(form.listeningHours),
      readingHours: Number(form.readingHours),
      writingHours: Number(form.writingHours),
      speakingHours: Number(form.speakingHours),
      note: form.note.trim() || undefined,
    };
    if (editing) {
      updateCheckin(editing.id, payload);
    } else {
      addCheckin(payload);
    }
    setOpen(false);
  };

  return (
    <>
      {/* 本周汇总 */}
      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <CalendarDays size={14} className="text-silver-500" />
              本周学习时长
            </div>
            <div className="flex items-center gap-2 text-2xs text-muted">
              <span>{weeklyStats.count} 次打卡</span>
              <span>·</span>
              <span className="font-mono text-secondary tabular-nums">
                {weeklyStats.total.toFixed(1)} / {WEEKLY_GOAL_HOURS}h
              </span>
            </div>
          </div>
          <ProgressBar
            value={weeklyStats.total}
            max={WEEKLY_GOAL_HOURS}
            tone="silver"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            {SKILLS.map((s) => {
              const hours = weeklyStats.bySkill[s];
              return (
                <div
                  key={s}
                  className="surface-card rounded-md p-2.5"
                >
                  <div className="text-2xs text-muted uppercase tracking-wider">
                    {IELTS_SKILL_LABELS[s]}
                  </div>
                  <div className="text-sm font-mono tabular-nums text-primary mt-0.5">
                    {hours.toFixed(1)}h
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* 工具栏 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
          打卡记录
          <span className="ml-1.5 text-muted">{checkins.length}</span>
        </h3>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={14} /> 新建打卡
        </Button>
      </div>

      {/* 列表 */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="还没有打卡记录"
          description="记录每天各科学习时长，便于回顾节奏与坚持。"
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((c) => (
            <CheckinRow
              key={c.id}
              checkin={c}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleting(c)}
            />
          ))}
        </div>
      )}

      {/* 表单 */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑打卡" : "新建打卡"}
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
          <Field label="日期" required>
            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
            />
          </Field>

          <div>
            <div className="text-2xs text-muted uppercase tracking-wider mb-2">
              各科学习时长（小时）
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map((s) => {
                const key = `${s}Hours` as keyof FormState;
                return (
                  <Field key={s} label={IELTS_SKILL_LABELS[s]}>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={form[key] as string}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                    />
                  </Field>
                );
              })}
            </div>
          </div>

          <Field label="备注" hint="可选，今日重点 / 心得 / 卡点">
            <Textarea
              rows={3}
              value={form.note}
              placeholder="例如：听力 Section 3 错 4 题，需加强地图题。"
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="删除打卡"
        message={
          deleting
            ? `确认删除 ${fmtFullDate(deleting.date)} 的打卡记录？`
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteCheckin(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function CheckinRow({
  checkin,
  onEdit,
  onDelete,
}: {
  checkin: IELTSCheckin;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total =
    checkin.listeningHours +
    checkin.readingHours +
    checkin.writingHours +
    checkin.speakingHours;
  const thisWeek = isThisWeekISO(checkin.date);

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 rounded-md border border-default bg-surface hover:bg-hover transition-colors">
      <div className="shrink-0 w-20">
        <div className="text-sm font-medium text-primary">
          {fmtFullDate(checkin.date).slice(5)}
        </div>
        <div className="text-2xs text-muted">
          {thisWeek ? "本周" : ""}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {SKILLS.map((s) => {
            const hours =
              checkin[`${s}Hours` as keyof IELTSCheckin] as number;
            if (!hours) return null;
            return (
              <Badge key={s} tone={hours > 0 ? "silver" : "outline"}>
                {SKILL_LABELS[s]} {hours}h
              </Badge>
            );
          })}
          <Badge tone="neutral">合计 {total.toFixed(1)}h</Badge>
        </div>
        {checkin.note && (
          <p className="text-2xs text-tertiary line-clamp-2">
            {checkin.note}
          </p>
        )}
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
