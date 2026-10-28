import type { CompletedProject, Project } from "../types";

export function assignmentDescription(project: Project | undefined, work?: string | null): string {
  return work?.trim() || project?.description?.trim() || project?.tech?.join(", ") || "";
}

export function projectDescription(project: Project, today: string): string {
  const cells = project.cells ?? [];
  const active = cells.filter((cell) => cell.start <= today && cell.end >= today);
  const work = [...new Set((active.length ? active : cells).map((cell) => cell.work.trim()).filter(Boolean))];
  return work.join("; ") || assignmentDescription(project);
}

export function completedProjectDescription(project: CompletedProject): string {
  return [...new Set(project.contributors.map((contributor) => contributor.workSummary.trim()).filter(Boolean))].join("; ")
    || project.tech.join(", ");
}
