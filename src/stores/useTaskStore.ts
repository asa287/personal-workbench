import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task } from "@/types";
import { genId, nowISO } from "@/lib/id";

interface TaskState {
  tasks: Task[];
  addTask: (input: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  postponeTask: (id: string, days: number) => void;
  toggleStatus: (id: string, status: Task["status"]) => void;
  importTasks: (tasks: Task[], replace?: boolean) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (input) => {
        const now = nowISO();
        const task: Task = {
          ...input,
          id: genId("task"),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: nowISO() } : t
          ),
        })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      completeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status: "done", updatedAt: nowISO() } : t
          ),
        })),
      postponeTask: (id, days) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const base = t.dueDate ? new Date(t.dueDate) : new Date();
            base.setDate(base.getDate() + days);
            return {
              ...t,
              dueDate: base.toISOString(),
              status: "postponed",
              updatedAt: nowISO(),
            };
          }),
        })),
      toggleStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status, updatedAt: nowISO() } : t
          ),
        })),
      importTasks: (tasks, replace) =>
        set((s) => ({
          tasks: replace ? tasks : [...tasks, ...s.tasks],
        })),
    }),
    { name: "pwb:tasks" }
  )
);
