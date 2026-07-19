import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Target, CalendarClock, Award, Sparkles, X } from "lucide-react";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { Segmented } from "@/components/ui/Segmented";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AIAssistButton } from "@/components/shared/AIAssistButton";
import { IELTS_SKILL_LABELS } from "@/lib/labels";
import { fmtDate, fmtFullDate, daysUntil } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { IELTSSkill } from "@/types";
import PlanTab from "./PlanTab";
import CheckinTab from "./CheckinTab";
import ErrorsTab from "./ErrorsTab";
import MockScoreTab from "./MockScoreTab";
import CourseTab from "./CourseTab";

// tab 取值：plan 默认，其余从 URL 读取
type IELTSTab = "plan" | "checkin" | "errors" | "mock" | "course";

const TAB_OPTIONS: { value: IELTSTab; label: string }[] = [
  { value: "plan", label: "计划" },
  { value: "checkin", label: "打卡" },
  { value: "errors", label: "错题" },
  { value: "mock", label: "模考" },
  { value: "course", label: "课程纪要" },
];

const VALID_TABS: IELTSTab[] = ["plan", "checkin", "errors", "mock", "course"];

export default function IELTSPage() {
  const plans = useIELTSStore((s) => s.plans);
  const mocks = useIELTSStore((s) => s.mocks);
  const [params, setParams] = useSearchParams();

  // 当前 tab：默认 plan
  const tabParam = params.get("tab");
  const initialTab: IELTSTab =
    tabParam && VALID_TABS.includes(tabParam as IELTSTab)
      ? (tabParam as IELTSTab)
      : "plan";
  const [tab, setTab] = useState<IELTSTab>(initialTab);

  // 新建触发信号：每次 ?new=1 出现时自增，传给子 tab
  const [newSignal, setNewSignal] = useState(0);

  // AI 采纳后的下周建议（本地展示）
  const [advice, setAdvice] = useState<string | null>(null);

  // 同步 URL：tab 切换 / new=1
  useEffect(() => {
    if (params.get("new") === "1") {
      setNewSignal((n) => n + 1);
      params.delete("new");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const onTabChange = (next: IELTSTab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    if (next === "plan") {
      p.delete("tab");
    } else {
      p.set("tab", next);
    }
    setParams(p, { replace: true });
  };

  // 当前活跃计划：取最新一条（同时只允许一个活跃计划）
  const currentPlan = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) =>
      a.startDate < b.startDate ? 1 : -1
    )[0];
  }, [plans]);

  // 最近一次模考
  const latestMock = useMemo(() => {
    if (!mocks.length) return null;
    return [...mocks].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  }, [mocks]);

  const examDays = currentPlan?.examDate
    ? daysUntil(currentPlan.examDate)
    : null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      {/* 顶部状态区 */}
      {currentPlan ? (
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 当前计划 */}
          <Card className="md:col-span-2">
            <CardBody className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-silver-300/15 text-silver-700 dark:text-silver-300 flex items-center justify-center shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xs text-muted uppercase tracking-wider">
                    当前计划
                  </span>
                  <Badge tone="silver">
                    目标 {currentPlan.targetScore}
                  </Badge>
                </div>
                <div className="text-sm text-primary">
                  起始 {fmtDate(currentPlan.startDate)}
                  {currentPlan.examDate && (
                    <span className="text-secondary">
                      {" · 考试 "}
                      {fmtFullDate(currentPlan.examDate)}
                    </span>
                  )}
                </div>
                {currentPlan.weaknesses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {currentPlan.weaknesses.map((w) => (
                      <Badge key={w} tone="outline">
                        {IELTS_SKILL_LABELS[w]} 薄弱
                      </Badge>
                    ))}
                  </div>
                )}
                {currentPlan.note && (
                  <p className="mt-2 text-2xs text-tertiary line-clamp-2">
                    {currentPlan.note}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* 考试倒计时 + 最近模考 */}
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock size={14} className="text-silver-500" />
                <span className="text-2xs text-muted uppercase tracking-wider">
                  距考试
                </span>
                <span className="ml-auto font-mono text-lg tabular-nums text-primary">
                  {examDays === null ? "—" : `${examDays}d`}
                </span>
              </div>
              <div className="h-px bg-[var(--border-default)]" />
              <div className="flex items-center gap-2">
                <Award size={14} className="text-silver-500" />
                <span className="text-2xs text-muted uppercase tracking-wider">
                  最近模考
                </span>
                <span className="ml-auto font-mono text-lg tabular-nums text-primary">
                  {latestMock ? latestMock.overall.toFixed(1) : "—"}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Target size={20} />}
          title="尚未创建备考计划"
          description="先设定目标分数与考试日期，再开始打卡与模考追踪。"
          action={
            <Button variant="primary" size="md" onClick={() => onTabChange("plan")}>
              <Sparkles size={14} /> 去创建计划
            </Button>
          }
          className="mb-5"
        />
      )}

      {/* AI 建议 + 工具栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={tab}
          onChange={(v) => onTabChange(v as IELTSTab)}
          options={TAB_OPTIONS}
        />
        <div className="flex-1" />
        {currentPlan && (
          <AIAssistButton
            type="ielts-plan"
            ctx={{ ieltsPlan: currentPlan, ieltsMocks: mocks }}
            label="生成下周建议"
            size="md"
            onAdopt={(content) => setAdvice(content)}
          />
        )}
      </div>

      {/* AI 采纳后的建议展示 */}
      {advice && (
        <Card className="mb-4">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles size={13} className="text-silver-500" />
                下周备考建议
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAdvice(null)}
                title="关闭"
              >
                <X size={14} />
              </Button>
            </div>
            <pre className="text-xs text-secondary whitespace-pre-wrap font-body leading-relaxed">
              {advice}
            </pre>
          </CardBody>
        </Card>
      )}

      {/* tab 内容 */}
      <div className={cn(!currentPlan && tab !== "plan" && tab !== "course" && "opacity-60 pointer-events-none")}>
        {tab === "plan" && <PlanTab />}
        {tab === "checkin" && <CheckinTab newSignal={newSignal} />}
        {tab === "errors" && <ErrorsTab newSignal={newSignal} />}
        {tab === "mock" && <MockScoreTab newSignal={newSignal} />}
        {tab === "course" && <CourseTab newSignal={newSignal} />}
      </div>
    </div>
  );
}

// 给子 tab 复用的 skill 顺序
export const SKILL_ORDER: IELTSSkill[] = [
  "listening",
  "reading",
  "writing",
  "speaking",
];
