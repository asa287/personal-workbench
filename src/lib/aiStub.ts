import type {
  Task,
  Project,
  IELTSPlan,
  IELTSMockScore,
  CultureItem,
} from "@/types";
import { SKILL_LABELS } from "@/stores/useIELTSStore";

export type AIAssistType =
  | "today-summary"
  | "project-wrap"
  | "ielts-plan"
  | "content-idea"
  | "culture-organize";

export interface AIContext {
  tasks?: Task[];
  projects?: Project[];
  ieltsPlan?: IELTSPlan;
  ieltsMocks?: IELTSMockScore[];
  culture?: CultureItem[];
  project?: Project;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 本地模板模拟 AI 输出，预留接入真实 LLM 接口。
 * 所有输出返回字符串（Markdown），调用方需要进入草稿态确认。
 */
export async function generateDraft(
  type: AIAssistType,
  ctx: AIContext = {}
): Promise<string> {
  await delay(600);

  switch (type) {
    case "today-summary":
      return todaySummary(ctx.tasks ?? []);
    case "project-wrap":
      return projectWrap(ctx.project ?? (ctx.projects ?? [])[0]);
    case "ielts-plan":
      return ieltsPlan(ctx.ieltsPlan, ctx.ieltsMocks ?? []);
    case "content-idea":
      return contentIdeas(ctx.culture ?? []);
    case "culture-organize":
      return cultureOrganize(ctx.culture ?? []);
    default:
      return "（暂不支持该类型 AI 辅助）";
  }
}

function todaySummary(tasks: Task[]): string {
  const overdue = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      !isSameDay(new Date(t.dueDate), new Date())
  );
  const today = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.dueDate &&
      isSameDay(new Date(t.dueDate), new Date())
  );
  const urgent = tasks.filter(
    (t) => t.status !== "done" && t.priority === "urgent"
  );
  const lines: string[] = ["# 今日摘要", ""];
  if (overdue.length) {
    lines.push(
      `⚠️ **逾期 ${overdue.length} 项**：${overdue
        .slice(0, 3)
        .map((t) => t.title)
        .join("、")}${overdue.length > 3 ? " 等" : ""}`
    );
  }
  if (today.length) {
    lines.push(`📅 **今日到期 ${today.length} 项**：`);
    today
      .slice(0, 5)
      .forEach((t) => lines.push(`- [${t.priority}] ${t.title}`));
  } else {
    lines.push("✅ 今日无到期任务，适合推进长期项目。");
  }
  if (urgent.length) {
    lines.push(`🔥 **紧急 ${urgent.length} 项**：优先处理。`);
  }
  lines.push("", "— 本摘要由本地模板生成，可编辑后保存。");
  return lines.join("\n");
}

function projectWrap(p?: Project): string {
  if (!p) return "（未选择项目，无法生成简历文案）";
  const kr = p.keyResults.filter(Boolean).slice(0, 3);
  const lines: string[] = [
    "# 简历文案草稿",
    "",
    `**项目名称**：${p.name}`,
    "",
    `**角色**：${p.role || "负责人"}`,
    "",
    `**时间**：${p.startDate}${p.endDate ? " — " + p.endDate : " 至今"}`,
    "",
    `**目标**：${p.goal || "—"}`,
    "",
    "**关键成果**：",
    ...(kr.length
      ? kr.map((k) => `- ${k}`)
      : ["- （请补充关键成果数据"]),
    "",
    p.review ? `**复盘**：${p.review}` : "",
    "",
    "— AI 草稿，请按简历风格润色后使用。",
  ];
  return lines.filter(Boolean).join("\n");
}

function ieltsPlan(plan?: IELTSPlan, mocks: IELTSMockScore[] = []): string {
  const latest = [...mocks].sort((a, b) =>
    a.date < b.date ? 1 : -1
  )[0];
  const lines: string[] = ["# 下周备考建议", ""];
  if (plan) {
    lines.push(
      `**目标分数**：${plan.targetScore}`,
      `**薄弱项**：${plan.weaknesses.map((w) => SKILL_LABELS[w]).join("、") || "未设定"}`,
      ""
    );
  }
  if (latest) {
    lines.push(
      `**最近模考**：总分 ${latest.overall}（听 ${latest.listening} / 读 ${latest.reading} / 写 ${latest.writing} / 说 ${latest.speaking}）`,
      ""
    );
  }
  lines.push("**建议节奏**：", "- 周一/三/五：薄弱项专项训练（2 小时）", "- 周二/四：完整模考 + 错题复盘", "- 周末：写作批改 + 口语对练");
  lines.push("", "— AI 草稿，请根据本周实际进度调整后采纳。");
  return lines.join("\n");
}

function contentIdeas(culture: CultureItem[]): string {
  const materials = culture
    .filter((c) => c.reusableMaterial || c.excerpts.some((e) => e.isMaterial))
    .slice(0, 5);
  const lines: string[] = ["# 自媒体选题草稿（基于积累素材）", ""];
  if (!materials.length) {
    lines.push("（暂无可复用素材，请先在「个人积累」中标记摘录为素材）");
  } else {
    materials.forEach((c, i) => {
      const excerpt = c.excerpts.find((e) => e.isMaterial);
      lines.push(
        `## 选题 ${i + 1}：${c.title} — ${c.type === "book" ? "读书笔记" : c.type === "movie" || c.type === "tv" ? "观后感" : "思考"}`
      );
      if (excerpt) {
        lines.push(`> ${excerpt.content.slice(0, 80)}...`, "");
      }
      lines.push("**钩子**：（基于素材提炼一句观点）", "**结构**：开头观点 → 素材引用 → 个人延伸 → 行动建议", "");
    });
  }
  lines.push("— AI 草稿，请确认后保存为正式选题。");
  return lines.join("\n");
}

function cultureOrganize(culture: CultureItem[]): string {
  const recent = culture
    .filter((c) => c.status === "done")
    .slice(0, 5);
  const lines: string[] = ["# 素材整理草稿", ""];
  if (!recent.length) {
    lines.push("（暂无已完成积累，无法整理）");
  } else {
    lines.push("**主题聚类**：");
    recent.forEach((c) => {
      const tags = c.tags.length ? c.tags.join("、") : "未分类";
      lines.push(`- **${c.title}**（${tags}）：${c.opinion || "—"}`);
    });
    lines.push("", "**可复用观点**：", "- （从摘录中提炼一句金句）");
  }
  lines.push("", "— AI 草稿，请编辑后保存到积累或自媒体。");
  return lines.join("\n");
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
