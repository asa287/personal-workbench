import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Plus, Pencil, Trash2, Award, Wand2 } from "lucide-react";
import { useIELTSStore, SKILL_LABELS } from "@/stores/useIELTSStore";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IELTS_SKILL_LABELS } from "@/lib/labels";
import { fmtFullDate, fmtDate } from "@/lib/date";
import { todayISODate } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { IELTSMockScore, IELTSSkill } from "@/types";

const SKILLS: IELTSSkill[] = ["listening", "reading", "writing", "speaking"];

// 暗色友好的中性色：overall 用最深的 silver-700 突出
const LINE_COLORS: Record<string, string> = {
  overall: "#5C5C66",
  listening: "#C0C0C8",
  reading: "#8A8A93",
  writing: "#A1A1AA",
  speaking: "#71717A",
};

interface FormState {
  date: string;
  listening: string;
  reading: string;
  writing: string;
  speaking: string;
  overall: string;
}

function emptyForm(): FormState {
  return {
    date: todayISODate(),
    listening: "6",
    reading: "6",
    writing: "6",
    speaking: "6",
    overall: "6",
  };
}

function mockToForm(m: IELTSMockScore): FormState {
  return {
    date: m.date,
    listening: String(m.listening),
    reading: String(m.reading),
    writing: String(m.writing),
    speaking: String(m.speaking),
    overall: String(m.overall),
  };
}

// IELTS 总分计算：4 项平均后四舍五入到最近 0.5
function calcOverall(l: number, r: number, w: number, s: number): number {
  const avg = (l + r + w + s) / 4;
  return Math.round(avg * 2) / 2;
}

export default function MockScoreTab({ newSignal }: { newSignal: number }) {
  const mocks = useIELTSStore((s) => s.mocks);
  const addMock = useIELTSStore((s) => s.addMock);
  const updateMock = useIELTSStore((s) => s.updateMock);
  const deleteMock = useIELTSStore((s) => s.deleteMock);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IELTSMockScore | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleting, setDeleting] = useState<IELTSMockScore | null>(null);

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

  const openEdit = (m: IELTSMockScore) => {
    setEditing(m);
    setForm(mockToForm(m));
    setOpen(true);
  };

  const valid = useMemo(() => {
    const nums = [
      form.listening,
      form.reading,
      form.writing,
      form.speaking,
      form.overall,
    ].map(Number);
    return (
      form.date.trim() !== "" &&
      nums.every((n) => Number.isFinite(n) && n >= 0 && n <= 9)
    );
  }, [form]);

  const submit = () => {
    if (!valid) return;
    const payload = {
      date: form.date,
      listening: Number(form.listening),
      reading: Number(form.reading),
      writing: Number(form.writing),
      speaking: Number(form.speaking),
      overall: Number(form.overall),
    };
    if (editing) {
      updateMock(editing.id, payload);
    } else {
      addMock(payload);
    }
    setOpen(false);
  };

  // 按日期升序，用于折线图
  const sorted = useMemo(
    () => [...mocks].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [mocks]
  );

  const chartData = useMemo(
    () =>
      sorted.map((m) => ({
        date: m.date,
        dateLabel: fmtDate(m.date).slice(5),
        overall: m.overall,
        listening: m.listening,
        reading: m.reading,
        writing: m.writing,
        speaking: m.speaking,
      })),
    [sorted]
  );

  // 最近 / 最高 总分
  const summary = useMemo(() => {
    if (!mocks.length) return null;
    const latest = [...mocks].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const best = [...mocks].sort((a, b) => b.overall - a.overall)[0];
    return { latest, best, count: mocks.length };
  }, [mocks]);

  return (
    <>
      {/* 趋势图 */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Award size={14} className="text-silver-500" />
              模考趋势
            </div>
            {summary && (
              <div className="flex items-center gap-3 text-2xs text-muted">
                <span>
                  最近
                  <span className="ml-1 font-mono text-secondary tabular-nums">
                    {summary.latest.overall.toFixed(1)}
                  </span>
                </span>
                <span>·</span>
                <span>
                  最高
                  <span className="ml-1 font-mono text-secondary tabular-nums">
                    {summary.best.overall.toFixed(1)}
                  </span>
                </span>
                <span>·</span>
                <span>共 {summary.count} 次</span>
              </div>
            )}
          </div>
          {chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-2xs text-muted">
              暂无模考数据
            </div>
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-default)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-default)" }}
                  />
                  <YAxis
                    domain={[0, 9]}
                    ticks={[0, 3, 4.5, 6, 7.5, 9]}
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-default)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                    labelStyle={{ color: "var(--text-tertiary)" }}
                    labelFormatter={(label) => `日期 ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name="总分"
                    stroke={LINE_COLORS.overall}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: LINE_COLORS.overall }}
                    activeDot={{ r: 5 }}
                  />
                  {SKILLS.map((s) => (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      name={IELTS_SKILL_LABELS[s]}
                      stroke={LINE_COLORS[s]}
                      strokeWidth={1.5}
                      strokeDasharray={s === "writing" || s === "speaking" ? "4 2" : undefined}
                      dot={{ r: 2.5, fill: LINE_COLORS[s] }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 工具栏 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider">
          模考记录
          <span className="ml-1.5 text-muted">{mocks.length}</span>
        </h3>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={14} /> 新建模考
        </Button>
      </div>

      {/* 列表 */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Award size={20} />}
          title="还没有模考记录"
          description="按周期做完整模考，追踪总分与各科趋势变化。"
        />
      ) : (
        <div className="surface-card rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default text-2xs text-muted uppercase tracking-wider">
                <th className="text-left font-medium px-3 py-2">日期</th>
                <th className="text-center font-medium px-2 py-2">听力</th>
                <th className="text-center font-medium px-2 py-2">阅读</th>
                <th className="text-center font-medium px-2 py-2">写作</th>
                <th className="text-center font-medium px-2 py-2">口语</th>
                <th className="text-center font-medium px-2 py-2">总分</th>
                <th className="text-right font-medium px-3 py-2 w-16">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {[...sorted]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((m) => {
                  const isBest =
                    summary?.best.id === m.id && summary.best.overall > 0;
                  return (
                    <tr key={m.id} className="hover:bg-hover transition-colors group">
                      <td className="px-3 py-2.5 text-primary">
                        {fmtFullDate(m.date).slice(5)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-secondary">
                        {m.listening.toFixed(1)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-secondary">
                        {m.reading.toFixed(1)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-secondary">
                        {m.writing.toFixed(1)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-secondary">
                        {m.speaking.toFixed(1)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-mono tabular-nums font-semibold",
                            isBest ? "text-silver-700 dark:text-silver-300" : "text-primary"
                          )}
                        >
                          {m.overall.toFixed(1)}
                          {isBest && <Badge tone="silver">最高</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(m)}
                            title="编辑"
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(m)}
                            title="删除"
                            className="hover:text-danger"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 表单 */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑模考" : "新建模考"}
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
              各科分数（0 ~ 9）
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map((s) => (
                <Field key={s} label={IELTS_SKILL_LABELS[s]}>
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    step={0.5}
                    value={form[s]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [s]: e.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
          </div>

          <Field label="总分" required hint="可点击右侧按钮按四项平均自动计算">
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                max={9}
                step={0.5}
                value={form.overall}
                onChange={(e) =>
                  setForm((f) => ({ ...f, overall: e.target.value }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    overall: String(
                      calcOverall(
                        Number(f.listening),
                        Number(f.reading),
                        Number(f.writing),
                        Number(f.speaking)
                      )
                    ),
                  }))
                }
                title="按四项平均计算"
              >
                <Wand2 size={13} /> 自动
              </Button>
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="删除模考"
        message={
          deleting
            ? `确认删除 ${fmtFullDate(deleting.date)} 的模考记录？`
            : ""
        }
        destructive
        confirmText="删除"
        onConfirm={() => {
          if (deleting) deleteMock(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
