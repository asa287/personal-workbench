import { genId, nowISO, todayISODate } from "@/lib/id";
import { getStorageScope } from "@/lib/storageScope";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTaskStore } from "@/stores/useTaskStore";

const DEMO_SEEDED_KEY = "pwb-demo:seeded";

/** 首次进入 /try 且沙箱为空时，写入轻量演示数据 */
export function seedDemoIfEmpty() {
  if (getStorageScope() !== "demo") return;
  try {
    if (localStorage.getItem(DEMO_SEEDED_KEY) === "1") return;
  } catch {
    // continue
  }

  const { tasks } = useTaskStore.getState();
  const { projects } = useProjectStore.getState();
  if (tasks.length > 0 || projects.length > 0) {
    try {
      localStorage.setItem(DEMO_SEEDED_KEY, "1");
    } catch {
      // ignore
    }
    return;
  }

  const now = nowISO();
  const project = useProjectStore.getState().addProject({
    name: "个人作品集网站",
    goal: "用一套克制的黑白蓝界面，展示项目、积累与联系方式",
    startDate: todayISODate(),
    role: "产品 / 全栈",
    keyResults: ["完成公开主页", "打通试用沙箱", "邀请码注册流程"],
    relatedTaskIds: [],
    materialLinks: [],
    status: "doing",
    visibility: "public",
    portfolioNote: "面向 HR 的公开投影与本地试用沙箱。",
  });

  useTaskStore.getState().addTask({
    title: "完善公开主页文案",
    module: "project",
    relatedId: project.id,
    priority: "high",
    status: "doing",
    dueDate: now,
    note: "演示数据：可随意编辑或删除",
  });

  useTaskStore.getState().addTask({
    title: "体验待办与项目管理",
    module: "todo",
    priority: "medium",
    status: "todo",
    note: `演示条目 ${genId("demo")}`,
  });

  try {
    localStorage.setItem(DEMO_SEEDED_KEY, "1");
  } catch {
    // ignore
  }
}
