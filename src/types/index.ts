// 通用类型
export type ID = string;
export type ISODateTime = string;
export type ISODate = string;

/** 内容可见性：默认 private；public 可发布到个人网站 */
export type Visibility = "private" | "public";

// ===== Tool 配置 =====
export type ToolId =
  | "dashboard"
  | "tasks"
  | "projects"
  | "ielts"
  | "media"
  | "culture";

export interface ToolConfig {
  id: ToolId;
  visible: boolean;
  order: number;
}

// ===== Task（待办） =====
export type TaskModule = "todo" | "project" | "ielts" | "media" | "culture";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "doing" | "done" | "postponed";

export interface Task {
  id: ID;
  title: string;
  module: TaskModule;
  relatedId?: ID;
  dueDate?: ISODateTime;
  priority: TaskPriority;
  remindAt?: ISODateTime;
  status: TaskStatus;
  note?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ===== Project =====
export type ProjectStatus = "idea" | "doing" | "paused" | "done" | "archived";

// 项目合集：将多个项目归纳到一个合集
export interface Collection {
  id: ID;
  name: string;
  description?: string;
  color?: string; // 视觉标识色（hex 或 tailwind 色名）
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Project {
  id: ID;
  name: string;
  goal: string;
  startDate: ISODate;
  endDate?: ISODate;
  role: string;
  keyResults: string[];
  relatedTaskIds: ID[];
  materialLinks: string[];
  review?: string;
  status: ProjectStatus;
  portfolioNote?: string;
  collectionId?: ID; // 所属合集（可选）
  visibility?: Visibility;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ===== IELTS 雅思 =====
export type IELTSSkill = "listening" | "reading" | "writing" | "speaking";
export type ErrorReviewStatus = "new" | "reviewing" | "mastered";

export interface IELTSPlan {
  id: ID;
  targetScore: number;
  examDate?: ISODate;
  weaknesses: IELTSSkill[];
  startDate: ISODate;
  note?: string;
}

export interface IELTSCheckin {
  id: ID;
  date: ISODate;
  listeningHours: number;
  readingHours: number;
  writingHours: number;
  speakingHours: number;
  note?: string;
}

export interface IELTSError {
  id: ID;
  date: ISODate;
  skill: IELTSSkill;
  question: string;
  reason?: string;
  reviewStatus: ErrorReviewStatus;
}

export interface IELTSMockScore {
  id: ID;
  date: ISODate;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  overall: number;
}

// 线下课程纪要（lecture / seminar）
export type IELTSCourseType = "lecture" | "seminar";

export interface IELTSCourse {
  id: ID;
  date: ISODate;
  type: IELTSCourseType;
  topic: string; // 主题
  lecturer?: string; // 讲师
  minutes: string; // 会议纪要
  dailyReview?: string; // 每日复盘
  relatedTaskIds: ID[]; // 关联待办
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ===== Content（自媒体） =====
export type MediaPlatform = "xiaohongshu" | "douyin" | "other";
export type ContentStatus =
  | "idea"
  | "drafting"
  | "scheduled"
  | "published"
  | "archived";

export interface ContentItem {
  id: ID;
  platform: MediaPlatform;
  title: string;
  direction?: string;
  tags: string[];
  referenceLinks: string[];
  materialIds: ID[];
  status: ContentStatus;
  publishDate?: ISODateTime;
  views: number;
  likes: number;
  collects: number;
  comments: number;
  review?: string;
  visibility?: Visibility;
  publicUrl?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ===== Culture（个人积累） =====
export type CultureType =
  | "book"
  | "movie"
  | "tv"
  | "podcast"
  | "article"
  | "other";
export type CultureStatus = "wishlist" | "reading" | "done" | "abandoned";

export interface Excerpt {
  id: ID;
  content: string;
  isMaterial: boolean;
  linkedContentIds: ID[];
}

export interface CultureItem {
  id: ID;
  type: CultureType;
  title: string;
  creator?: string;
  status: CultureStatus;
  startDate?: ISODate;
  finishDate?: ISODate;
  rating: number;
  tags: string[];
  excerpts: Excerpt[];
  opinion?: string;
  reusableMaterial: boolean;
  note?: string;
  posterUrl?: string; // 海报 / 封面图链接（用于电影/电视剧等网格展示）
  visibility?: Visibility;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ===== 公开个人网站投影 =====
export interface PublicSocialLink {
  label: string;
  url: string;
}

export interface PublicProfile {
  displayName: string;
  headline?: string;
  bio?: string;
  contactEmail?: string;
  links: PublicSocialLink[];
}

export interface PublicProjectCard {
  id: ID;
  name: string;
  goal: string;
  role: string;
  status: ProjectStatus;
  keyResults: string[];
  portfolioNote?: string;
  materialLinks: string[];
}

export interface PublicCultureCard {
  id: ID;
  type: CultureType;
  title: string;
  creator?: string;
  rating: number;
  tags: string[];
  opinion?: string;
  posterUrl?: string;
}

export interface PublicLinkCard {
  id: ID;
  title: string;
  url?: string;
  platform?: MediaPlatform;
  tags: string[];
}

export interface PublicProjection {
  updatedAt: ISODateTime;
  profile: PublicProfile;
  projects: PublicProjectCard[];
  culture: PublicCultureCard[];
  links: PublicLinkCard[];
}

// ===== Settings =====
export interface AppSettings {
  theme: "dark" | "light";
  sidebarCollapsed: boolean;
}

// ===== 导入导出包 =====
export interface ExportBundle {
  version: string;
  exportedAt: ISODateTime;
  data: {
    tasks: Task[];
    projects: Project[];
    collections: Collection[];
    ieltsPlan: IELTSPlan[];
    ieltsCheckin: IELTSCheckin[];
    ieltsErrors: IELTSError[];
    ieltsMock: IELTSMockScore[];
    ieltsCourses: IELTSCourse[];
    content: ContentItem[];
    culture: CultureItem[];
    tools: ToolConfig[];
    settings: AppSettings;
  };
}
