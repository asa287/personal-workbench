import type { ToolId } from "@/types";
import {
  LayoutDashboard,
  CheckSquare,
  KanbanSquare,
  GraduationCap,
  Radio,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

/**
 * 工具分组：
 * - pinned：每日启动页（独立置顶，固定不可隐藏）
 * - urgent：即时推进（着急要做的任务）
 * - longterm：长期积累（无需急于处理）
 */
export type ToolGroup = "pinned" | "urgent" | "longterm";

export interface ToolMeta {
  id: ToolId;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  path: string;
  group: ToolGroup;
  fixed?: boolean; // 不可隐藏/排序
}

export const GROUP_LABELS: Record<ToolGroup, string> = {
  pinned: "每日启动页",
  urgent: "即时推进",
  longterm: "长期积累",
};

export const TOOL_META: Record<ToolId, ToolMeta> = {
  dashboard: {
    id: "dashboard",
    name: "每日启动页",
    shortName: "首页",
    description: "今日重点与全局概览",
    icon: LayoutDashboard,
    path: "/app",
    group: "pinned",
    fixed: true,
  },
  tasks: {
    id: "tasks",
    name: "待办提醒",
    shortName: "待办",
    description: "全局任务与提醒",
    icon: CheckSquare,
    path: "/app/tasks",
    group: "urgent",
  },
  projects: {
    id: "projects",
    name: "项目管理",
    shortName: "项目",
    description: "长期项目与作品集",
    icon: KanbanSquare,
    path: "/app/projects",
    group: "urgent",
  },
  ielts: {
    id: "ielts",
    name: "雅思备考",
    shortName: "雅思",
    description: "备考计划与模考",
    icon: GraduationCap,
    path: "/app/ielts",
    group: "urgent",
  },
  media: {
    id: "media",
    name: "自媒体账号管理",
    shortName: "自媒体",
    description: "小红书等内容运营",
    icon: Radio,
    path: "/app/media",
    group: "longterm",
  },
  culture: {
    id: "culture",
    name: "书影音记录",
    shortName: "书影音",
    description: "书影音与摘录素材",
    icon: BookOpen,
    path: "/app/culture",
    group: "longterm",
  },
};

export const TOOL_ORDER: ToolId[] = [
  "dashboard",
  "tasks",
  "projects",
  "ielts",
  "media",
  "culture",
];
