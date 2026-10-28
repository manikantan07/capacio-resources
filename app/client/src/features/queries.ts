import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  ActivityHistoryPage,
  Assignment,
  DeadlineChangeType,
  CompletedProject,
  CompletedStats,
  MarkCompleteResult,
  MovePreview,
  Person,
  Project,
  SkillMatch,
  UndoActivitiesResult,
} from "../types";

// ---- People ----

export const usePeople = () => useQuery({ queryKey: ["people"], queryFn: () => api.get<Person[]>("/api/people") });

export const useCreatePerson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; skills?: string }) => api.post<Person>("/api/people", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
};

export const useUpdatePerson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.put<Person>(`/api/people/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
};

export const useDeletePerson = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
};

// ---- Projects ----

export const useLiveProjects = () =>
  useQuery({ queryKey: ["projects", "live"], queryFn: () => api.get<Project[]>("/api/projects") });

export const useCompletedProjects = () =>
  useQuery({ queryKey: ["projects", "completed"], queryFn: () => api.get<CompletedProject[]>("/api/projects/completed") });

export const useCompletedStats = () =>
  useQuery({ queryKey: ["projects", "completed", "stats"], queryFn: () => api.get<CompletedStats>("/api/projects/completed/stats") });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Project>("/api/projects", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};

export const useMarkComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<MarkCompleteResult>(`/api/projects/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

/** Tentative → Active: the project's work starts counting toward capacity. */
export const useConfirmProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/api/projects/${id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["people"] });
    },
  });
};

export const useReopenProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/api/projects/${id}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["people"] });
    },
  });
};

// ---- Assignments ----

export const useAssignments = () =>
  useQuery({ queryKey: ["assignments"], queryFn: () => api.get<Assignment[]>("/api/assignments") });

const invalidateAssignmentGraph = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["assignments"] });
  qc.invalidateQueries({ queryKey: ["people"] });
  qc.invalidateQueries({ queryKey: ["projects"] });
};

export const useCreateAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { personId: string; projectId: string; work: string; alloc: number; start: string; end: string }) =>
      api.post<Assignment>("/api/assignments", body),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

export const useUpdateAlloc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alloc }: { id: string; alloc: number }) => api.put<Assignment>(`/api/assignments/${id}/alloc`, { alloc }),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

export const useUpdateAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...request }: { id: string; work: string; alloc: number; start: string; end: string; previousDeadline?: string; extensionReason?: string; deadlineChangeType?: DeadlineChangeType; reasonCategory?: string }) =>
      api.put<Assignment>(`/api/assignments/${id}`, request),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

export const useDeleteAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/assignments/${id}`),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

/** Marks one person's part as done — the server sets the end date to yesterday. */
export const useCompleteAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Assignment>(`/api/assignments/${id}/complete`),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

export const useReassignAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPersonId }: { id: string; newPersonId: string }) =>
      api.post<Assignment>(`/api/assignments/${id}/reassign`, { newPersonId }),
    onSuccess: () => invalidateAssignmentGraph(qc),
  });
};

export const useMovePreview = (assignmentId: string | null) =>
  useQuery({
    queryKey: ["assignments", assignmentId, "move-preview"],
    queryFn: () => api.get<MovePreview[]>(`/api/assignments/${assignmentId}/move-preview`),
    enabled: !!assignmentId,
  });

export const useSkillMatch = (personId: string | null, projectId: string | null) =>
  useQuery({
    queryKey: ["skill-match", personId, projectId],
    queryFn: () => api.get<SkillMatch>(`/api/assignments/skill-match?personId=${personId}&projectId=${projectId}`),
    enabled: !!personId && !!projectId,
  });

// ---- Activity ----

export const useActivityHistory = (from: string | null, to: string | null, page = 1, pageSize = 100) =>
  useQuery({
    queryKey: ["activity", from, to, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return api.get<ActivityHistoryPage>(`/api/activity?${params}`);
    },
  });

export const useUndoActivities = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activityIds: string[]) => api.post<UndoActivitiesResult>("/api/activity/undo", { activityIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
};

// ---- Auth ----

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.post<void>("/api/auth/change-password", { currentPassword, newPassword }),
  });
