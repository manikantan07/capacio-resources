// Client-side mirror of the backend's AllocationRules (server/DeliveryHub.Application/
// Rules/AllocationRules.cs) — needed because Draft mode and the Briefing call
// generator must compute load/band against a *staged*, not-yet-persisted assignment
// array that the server has never seen. The server remains authoritative for anything
// actually persisted; this is purely for optimistic, in-browser derivation.

import type { Assignment, LoadBand, Person, Project } from "../types";

// Only confirmed projects count toward load: tentative (unconfirmed) work is shown
// separately via isTentative / calculateTentativeLoad.
export function isActive(assignment: Assignment, project: Project | undefined, today: string): boolean {
  if (!project) return false;
  return project.state !== "Completed" && project.state !== "Tentative" && assignment.start <= today && assignment.end >= today;
}

export function isTentative(assignment: Assignment, project: Project | undefined, today: string): boolean {
  return project?.state === "Tentative" && assignment.start <= today && assignment.end >= today;
}

export function calculateTentativeLoad(
  personId: string,
  assignments: Assignment[],
  projectsById: Map<string, Project>,
  today: string,
): number {
  return assignments
    .filter((a) => a.personId === personId && isTentative(a, projectsById.get(a.projectId), today))
    .reduce((sum, a) => sum + a.alloc, 0);
}

export function calculateLoad(
  personId: string,
  assignments: Assignment[],
  projectsById: Map<string, Project>,
  today: string,
): number {
  return assignments
    .filter((a) => a.personId === personId)
    .filter((a) => isActive(a, projectsById.get(a.projectId), today))
    .reduce((sum, a) => sum + a.alloc, 0);
}

export function getLoadBand(load: number): LoadBand {
  if (load > 100) return "OverAllocated";
  if (load === 100) return "FullyAllocated";
  if (load > 0) return "PartiallyAvailable";
  return "Available";
}

/** Away people (leave / sick leave) aren't available regardless of load, so their
 *  status replaces the capacity band. Notice period still works, so it isn't away. */
export function isAway(status: Person["status"]): boolean {
  return status === "OnLeave" || status === "SickLeave";
}

export const BAND_WORD: Record<LoadBand, string> = {
  OverAllocated: "Over",
  FullyAllocated: "Full",
  PartiallyAvailable: "Open",
  Available: "Free",
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function personProjectNames(personId: string, assignments: Assignment[], projectsById: Map<string, Project>, today: string): string[] {
  return assignments
    .filter((a) => a.personId === personId && isActive(a, projectsById.get(a.projectId), today))
    .map((a) => a.projectName);
}

export function fit(person: Person, project: Project): { hit: string[]; need: string[]; level: "Full" | "Partial" | "None" } {
  const tokenize = (raw: string[]) =>
    raw
      .flatMap((s) => s.split(/[,/]/))
      .map((s) => s.trim())
      .filter(Boolean);

  const skills = tokenize(person.skills);
  const need = Array.from(new Set(tokenize(project.tech).map((t) => t)));
  const hit = need.filter((req) => skills.some((s) => s.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(s.toLowerCase())));

  const level = need.length === 0 || hit.length === need.length ? "Full" : hit.length > 0 ? "Partial" : "None";
  return { hit, need, level };
}
