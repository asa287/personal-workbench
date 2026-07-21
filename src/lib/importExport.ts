import type {
  ExportBundle,
  Task,
  Project,
  Collection,
  IELTSPlan,
  IELTSCheckin,
  IELTSError,
  IELTSMockScore,
  IELTSCourse,
  ContentItem,
  CultureItem,
  ToolConfig,
  AppSettings,
} from "@/types";
import { useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useCollectionStore } from "@/stores/useCollectionStore";
import { useIELTSStore } from "@/stores/useIELTSStore";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { useToolStore } from "@/stores/useToolStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const EXPORT_VERSION = "2.0.0";

export function buildExportBundle(): ExportBundle {
  const taskStore = useTaskStore.getState();
  const projectStore = useProjectStore.getState();
  const collectionStore = useCollectionStore.getState();
  const ieltsStore = useIELTSStore.getState();
  const contentStore = useContentStore.getState();
  const cultureStore = useCultureStore.getState();
  const toolStore = useToolStore.getState();
  const settingsStore = useSettingsStore.getState();

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: taskStore.tasks,
      projects: projectStore.projects,
      collections: collectionStore.collections,
      ieltsPlan: ieltsStore.plans,
      ieltsCheckin: ieltsStore.checkins,
      ieltsErrors: ieltsStore.errors,
      ieltsMock: ieltsStore.mocks,
      ieltsCourses: ieltsStore.courses,
      content: contentStore.items,
      culture: cultureStore.items,
      tools: toolStore.tools,
      settings: {
        theme: settingsStore.theme,
        sidebarCollapsed: settingsStore.sidebarCollapsed,
      },
    },
  };
}

export function hasLocalUserData(bundle = buildExportBundle()): boolean {
  const { data } = bundle;
  return (
    data.tasks.length > 0 ||
    data.projects.length > 0 ||
    data.collections.length > 0 ||
    data.ieltsPlan.length > 0 ||
    data.ieltsCheckin.length > 0 ||
    data.ieltsErrors.length > 0 ||
    data.ieltsMock.length > 0 ||
    data.ieltsCourses.length > 0 ||
    data.content.length > 0 ||
    data.culture.length > 0
  );
}

export function applySnapshot(bundle: unknown): ImportResult {
  return importFromBundle(bundle, true);
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerDownload(filename, blob);
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    triggerDownload(filename, new Blob([""], { type: "text/csv" }));
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = Array.isArray(v) ? v.join("; ") : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  triggerDownload(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  message: string;
  counts?: {
    tasks?: number;
    projects?: number;
    collections?: number;
    ieltsPlan?: number;
    ieltsCheckin?: number;
    ieltsErrors?: number;
    ieltsMock?: number;
    ieltsCourses?: number;
    content?: number;
    culture?: number;
    tools?: number;
  };
}

export function importFromBundle(bundle: unknown, replace = false): ImportResult {
  if (!bundle || typeof bundle !== "object") {
    return { ok: false, message: "文件格式无效：不是 JSON 对象" };
  }
  const b = bundle as Partial<ExportBundle>;
  if (!b.data || typeof b.data !== "object") {
    return { ok: false, message: "文件格式无效：缺少 data 字段" };
  }
  const d = b.data;
  const counts: ImportResult["counts"] = {};

  try {
    if (Array.isArray(d.tasks)) {
      useTaskStore.getState().importTasks(d.tasks as Task[], replace);
      counts.tasks = d.tasks.length;
    }
    if (Array.isArray(d.projects)) {
      useProjectStore
        .getState()
        .importProjects(d.projects as Project[], replace);
      counts.projects = d.projects.length;
    }
    if (Array.isArray(d.collections)) {
      useCollectionStore
        .getState()
        .importCollections(d.collections as Collection[], replace);
      counts.collections = d.collections.length;
    }
    if (
      Array.isArray(d.ieltsPlan) ||
      Array.isArray(d.ieltsCheckin) ||
      Array.isArray(d.ieltsErrors) ||
      Array.isArray(d.ieltsMock) ||
      Array.isArray(d.ieltsCourses)
    ) {
      useIELTSStore.getState().importAll({
        plans: d.ieltsPlan as IELTSPlan[],
        checkins: d.ieltsCheckin as IELTSCheckin[],
        errors: d.ieltsErrors as IELTSError[],
        mocks: d.ieltsMock as IELTSMockScore[],
        courses: d.ieltsCourses as IELTSCourse[],
      });
      counts.ieltsPlan = d.ieltsPlan?.length;
      counts.ieltsCheckin = d.ieltsCheckin?.length;
      counts.ieltsErrors = d.ieltsErrors?.length;
      counts.ieltsMock = d.ieltsMock?.length;
      counts.ieltsCourses = d.ieltsCourses?.length;
    }
    if (Array.isArray(d.content)) {
      useContentStore.getState().importItems(d.content as ContentItem[], replace);
      counts.content = d.content.length;
    }
    if (Array.isArray(d.culture)) {
      useCultureStore
        .getState()
        .importItems(d.culture as CultureItem[], replace);
      counts.culture = d.culture.length;
    }
    if (Array.isArray(d.tools)) {
      useToolStore.getState().importTools(d.tools as ToolConfig[]);
      counts.tools = d.tools.length;
    }
    if (d.settings) {
      useSettingsStore
        .getState()
        .importSettings(d.settings as AppSettings);
    }
    return {
      ok: true,
      message: `导入成功${replace ? "（已覆盖）" : ""}`,
      counts,
    };
  } catch (e) {
    return {
      ok: false,
      message: `导入失败：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// 解析简单 CSV（不带引号嵌套），用于 Task 导入
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}
