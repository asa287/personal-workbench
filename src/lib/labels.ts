import type {
  TaskPriority,
  TaskStatus,
  TaskModule,
  ProjectStatus,
  MediaPlatform,
  ContentStatus,
  CultureType,
  CultureStatus,
  ErrorReviewStatus,
  IELTSSkill,
  IELTSCourseType,
} from "@/types";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

// 优先级文字色（用于行内强调）
export const PRIORITY_TEXT: Record<TaskPriority, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-600 dark:text-yellow-500",
  low: "text-green-600 dark:text-green-500",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
  postponed: "已延后",
};

export const TASK_MODULE_LABELS: Record<TaskModule, string> = {
  todo: "待办",
  project: "项目",
  ielts: "雅思",
  media: "自媒体",
  culture: "积累",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "想法池",
  doing: "进行中",
  paused: "暂停",
  done: "已完成",
  archived: "归档",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "idea",
  "doing",
  "paused",
  "done",
  "archived",
];

export const PLATFORM_LABELS: Record<MediaPlatform, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  other: "其他",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "选题",
  drafting: "草稿中",
  scheduled: "已排期",
  published: "已发布",
  archived: "已归档",
};

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "idea",
  "drafting",
  "scheduled",
  "published",
  "archived",
];

export const CULTURE_TYPE_LABELS: Record<CultureType, string> = {
  book: "书",
  movie: "电影",
  tv: "剧集",
  podcast: "播客",
  article: "文章",
  other: "其他",
};

// 顶部 Tab 标签：与 CULTURE_TYPE_LABELS 略有差异（书→读书笔记，剧集→电视剧）
export const CULTURE_TAB_LABELS: Record<CultureType, string> = {
  book: "读书笔记",
  movie: "电影",
  tv: "电视剧",
  podcast: "播客",
  article: "文章",
  other: "其他",
};

export const CULTURE_STATUS_LABELS: Record<CultureStatus, string> = {
  wishlist: "想读",
  reading: "在读",
  done: "已完成",
  abandoned: "已放弃",
};

export const ERROR_REVIEW_LABELS: Record<ErrorReviewStatus, string> = {
  new: "待复习",
  reviewing: "复习中",
  mastered: "已掌握",
};

export const IELTS_SKILL_LABELS: Record<IELTSSkill, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};

export const IELTS_COURSE_TYPE_LABELS: Record<IELTSCourseType, string> = {
  lecture: "Lecture",
  seminar: "Seminar",
};
