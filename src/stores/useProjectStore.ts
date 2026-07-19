import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";
import { genId, nowISO } from "@/lib/id";

interface ProjectState {
  projects: Project[];
  addProject: (input: Omit<Project, "id" | "createdAt" | "updatedAt">) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setStatus: (id: string, status: Project["status"]) => void;
  importProjects: (projects: Project[], replace?: boolean) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (input) => {
        const now = nowISO();
        const project: Project = {
          ...input,
          id: genId("proj"),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p
          ),
        })),
      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      setStatus: (id, status) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, status, updatedAt: nowISO() } : p
          ),
        })),
      importProjects: (projects, replace) =>
        set((s) => ({
          projects: replace ? projects : [...projects, ...s.projects],
        })),
    }),
    { name: "pwb:projects" }
  )
);
