import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  IELTSPlan,
  IELTSCheckin,
  IELTSError,
  IELTSMockScore,
  IELTSCourse,
  IELTSSkill,
  ErrorReviewStatus,
} from "@/types";
import { genId, nowISO } from "@/lib/id";

interface IELTSState {
  plans: IELTSPlan[];
  checkins: IELTSCheckin[];
  errors: IELTSError[];
  mocks: IELTSMockScore[];
  courses: IELTSCourse[];

  // Plan
  upsertPlan: (plan: IELTSPlan) => void;
  deletePlan: (id: string) => void;

  // Checkin
  addCheckin: (input: Omit<IELTSCheckin, "id">) => void;
  updateCheckin: (id: string, patch: Partial<IELTSCheckin>) => void;
  deleteCheckin: (id: string) => void;

  // Errors
  addError: (input: Omit<IELTSError, "id">) => void;
  updateError: (id: string, patch: Partial<IELTSError>) => void;
  setErrorReviewStatus: (id: string, status: ErrorReviewStatus) => void;
  deleteError: (id: string) => void;

  // Mock
  addMock: (input: Omit<IELTSMockScore, "id">) => void;
  updateMock: (id: string, patch: Partial<IELTSMockScore>) => void;
  deleteMock: (id: string) => void;

  // Course（线下课程纪要）
  addCourse: (input: Omit<IELTSCourse, "id" | "createdAt" | "updatedAt">) => void;
  updateCourse: (id: string, patch: Partial<IELTSCourse>) => void;
  deleteCourse: (id: string) => void;

  // Import
  importAll: (data: {
    plans?: IELTSPlan[];
    checkins?: IELTSCheckin[];
    errors?: IELTSError[];
    mocks?: IELTSMockScore[];
    courses?: IELTSCourse[];
  }) => void;
}

export const useIELTSStore = create<IELTSState>()(
  persist(
    (set) => ({
      plans: [],
      checkins: [],
      errors: [],
      mocks: [],
      courses: [],

      upsertPlan: (plan) =>
        set((s) => {
          const exists = s.plans.find((p) => p.id === plan.id);
          if (exists) {
            return {
              plans: s.plans.map((p) => (p.id === plan.id ? plan : p)),
            };
          }
          return { plans: [...s.plans, plan] };
        }),
      deletePlan: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      addCheckin: (input) =>
        set((s) => ({
          checkins: [{ ...input, id: genId("ielts-c") }, ...s.checkins],
        })),
      updateCheckin: (id, patch) =>
        set((s) => ({
          checkins: s.checkins.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),
      deleteCheckin: (id) =>
        set((s) => ({ checkins: s.checkins.filter((c) => c.id !== id) })),

      addError: (input) =>
        set((s) => ({
          errors: [{ ...input, id: genId("ielts-e") }, ...s.errors],
        })),
      updateError: (id, patch) =>
        set((s) => ({
          errors: s.errors.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      setErrorReviewStatus: (id, status) =>
        set((s) => ({
          errors: s.errors.map((e) =>
            e.id === id ? { ...e, reviewStatus: status } : e
          ),
        })),
      deleteError: (id) =>
        set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),

      addMock: (input) =>
        set((s) => ({
          mocks: [{ ...input, id: genId("ielts-m") }, ...s.mocks],
        })),
      updateMock: (id, patch) =>
        set((s) => ({
          mocks: s.mocks.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteMock: (id) =>
        set((s) => ({ mocks: s.mocks.filter((m) => m.id !== id) })),

      addCourse: (input) =>
        set((s) => {
          const now = nowISO();
          const course: IELTSCourse = {
            ...input,
            id: genId("ielts-course"),
            createdAt: now,
            updatedAt: now,
          };
          return { courses: [course, ...s.courses] };
        }),
      updateCourse: (id, patch) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowISO() } : c
          ),
        })),
      deleteCourse: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      importAll: (data) =>
        set((s) => ({
          plans: data.plans ?? s.plans,
          checkins: data.checkins ?? s.checkins,
          errors: data.errors ?? s.errors,
          mocks: data.mocks ?? s.mocks,
          courses: data.courses ?? s.courses,
        })),
    }),
    { name: "pwb:ielts" }
  )
);

export const SKILL_LABELS: Record<IELTSSkill, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "写作",
  speaking: "口语",
};
