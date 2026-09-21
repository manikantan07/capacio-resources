// Ported 1:1 from design_handoff_capcio/CAPCIO-implementation-spec.md §3 "Call
// generators, in priority order". Calls are derived, never stored — regenerate on
// every state change, exactly as the spec requires.

import { calculateLoad, fit, isActive } from "./allocationRules";
import type { Assignment, Person, Project } from "../types";

export interface CallActionDescriptor {
  label: string;
  detail: string;
  primary?: boolean;
  run: () => void;
}

export interface Call {
  id: string; // "kind:entityId" — used for dismiss keying
  kind: "over" | "unstaffed" | "idle" | "ending";
  toneColor: string;
  kindLabel: string;
  evidence: string;
  title: string;
  body: string;
  actions: CallActionDescriptor[];
  personId?: string; // drives "Open <Name>'s week"
}

interface DraftActions {
  updateAlloc: (id: string, alloc: number) => void;
  deleteAssignment: (id: string) => void;
  reassignAssignment: (id: string, newPersonId: string, newPersonName: string) => void;
  createAssignment: (input: { personId: string; projectId: string; projectName: string; projectColor: string; personName: string; work: string; alloc: number; start: string; end: string }) => void;
  updateAssignment: (id: string, patch: { work: string; alloc: number; start: string; end: string }) => void;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}

export function generateCalls(
  people: Person[],
  projects: Project[],
  assignments: Assignment[],
  today: string,
  actions: DraftActions,
  maxCalls = 5,
): Call[] {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const calls: Call[] = [];

  const loadOf = (personId: string) => calculateLoad(personId, assignments, projectsById, today);
  const liveAssignmentsOf = (personId: string) => assignments.filter((a) => a.personId === personId && isActive(a, projectsById.get(a.projectId), today));

  // --- Rank 1: Over capacity ---
  for (const person of people) {
    const load = loadOf(person.id);
    if (load <= 100) continue;
    const excess = load - 100;
    const live = liveAssignmentsOf(person.id);
    if (live.length === 0) continue;

    const viable = live.filter((a) => a.alloc >= excess).sort((a, b) => a.alloc - b.alloc)[0];
    const moveCandidate = viable ?? [...live].sort((a, b) => a.alloc - b.alloc)[0];

    // Target selection: highest fit among people where load + alloc <= 100, tie-break lowest load.
    const project = projectsById.get(moveCandidate.projectId);
    const targets = people
      .filter((p) => p.id !== person.id)
      .map((p) => ({ person: p, projectedLoad: loadOf(p.id) + moveCandidate.alloc, fitLevel: project ? fit(p, project).level : "None" as const }))
      .filter((t) => t.projectedLoad <= 100)
      .sort((a, b) => {
        const rank = { Full: 0, Partial: 1, None: 2 } as const;
        if (rank[a.fitLevel] !== rank[b.fitLevel]) return rank[a.fitLevel] - rank[b.fitLevel];
        return loadOf(a.person.id) - loadOf(b.person.id);
      });
    const target = targets[0];

    const callActions: CallActionDescriptor[] = [];
    if (target && project) {
      callActions.push({
        label: `Move to ${target.person.name}`,
        detail: `${person.name} ${load}%→${load - moveCandidate.alloc}%  ·  ${target.person.name} ${loadOf(target.person.id)}%→${target.projectedLoad}%`,
        primary: true,
        run: () => actions.reassignAssignment(moveCandidate.id, target.person.id, target.person.name),
      });
    }
    callActions.push({
      label: "Cut to fit",
      detail: `${moveCandidate.projectName} ${moveCandidate.alloc}%→${Math.max(5, moveCandidate.alloc - excess)}%`,
      run: () => actions.updateAlloc(moveCandidate.id, Math.max(5, moveCandidate.alloc - excess)),
    });
    callActions.push({
      label: "Drop it",
      detail: `Unassigns ${person.name} from ${moveCandidate.projectName}`,
      run: () => actions.deleteAssignment(moveCandidate.id),
    });

    calls.push({
      id: `over:${person.id}`,
      kind: "over",
      toneColor: "#E8442A",
      kindLabel: "Over capacity",
      evidence: `${person.name} · ${load}% booked (${excess}% over)`,
      title: `${person.name} is ${excess}% past capacity.`,
      body: target
        ? `Moving ${moveCandidate.projectName} to ${target.person.name} is the best fit — they'd land at ${target.projectedLoad}%.`
        : `No one has room to take ${moveCandidate.projectName} right now — cutting or dropping it are the only ways to bring ${person.name} back in range.`,
      actions: callActions,
      personId: person.id,
    });
  }

  // --- Rank 2: Unstaffed ---
  for (const project of projects) {
    if (project.state !== "Active") continue;
    const staffed = assignments.some((a) => a.projectId === project.id && isActive(a, project, today));
    if (staffed) continue;

    const candidates = people
      .map((p) => ({ person: p, level: fit(p, project).level, load: loadOf(p.id) }))
      .sort((a, b) => {
        const rank = { Full: 0, Partial: 1, None: 2 } as const;
        if (rank[a.level] !== rank[b.level]) return rank[a.level] - rank[b.level];
        return a.load - b.load;
      })
      .slice(0, 2);

    calls.push({
      id: `unstaffed:${project.id}`,
      kind: "unstaffed",
      toneColor: "#8F7210",
      kindLabel: "Unstaffed",
      evidence: `${project.name} · 0 people booked`,
      title: `${project.name} has nobody on it.`,
      body: `${candidates.map((c) => c.person.name).join(" and ")} ${candidates.length > 1 ? "are" : "is"} the best fit and ${candidates.length > 1 ? "have" : "has"} room this week.`,
      actions: candidates.map((c, i) => {
        const alloc = Math.min(50, 100 - c.load);
        return {
          label: `Assign ${c.person.name}`,
          detail: `${c.person.name} ${c.load}%→${c.load + alloc}%`,
          primary: i === 0,
          run: () =>
            actions.createAssignment({
              personId: c.person.id,
              projectId: project.id,
              projectName: project.name,
              projectColor: project.color,
              personName: c.person.name,
              work: project.tech.join(", "),
              alloc,
              start: today,
              end: addDays(today, 30),
            }),
        };
      }),
    });
  }

  // --- Rank 3: Unused capacity ---
  for (const person of people) {
    if (loadOf(person.id) !== 0) continue;
    const liveProjects = projects.filter((p) => p.state === "Active");
    const thinnest = liveProjects
      .map((p) => ({ project: p, staffed: assignments.filter((a) => a.projectId === p.id && isActive(a, p, today)).length }))
      .sort((a, b) => a.staffed - b.staffed)
      .slice(0, 2);

    if (thinnest.length === 0) continue;

    calls.push({
      id: `idle:${person.id}`,
      kind: "idle",
      toneColor: "#2A62D6",
      kindLabel: "Unused capacity",
      evidence: `${person.name} · 0% booked`,
      title: `${person.name} is free this week.`,
      body: `${thinnest.map((t) => t.project.name).join(" and ")} could use the help.`,
      actions: thinnest.map((t, i) => ({
        label: `Assign to ${t.project.name}`,
        detail: `${person.name} 0%→50%`,
        primary: i === 0,
        run: () =>
          actions.createAssignment({
            personId: person.id,
            projectId: t.project.id,
            projectName: t.project.name,
            projectColor: t.project.color,
            personName: person.name,
            work: t.project.tech.join(", "),
            alloc: 50,
            start: today,
            end: addDays(today, 30),
          }),
      })),
      personId: person.id,
    });
  }

  // --- Rank 4: Ending soon ---
  for (const assignment of assignments) {
    const project = projectsById.get(assignment.projectId);
    if (!isActive(assignment, project, today)) continue;
    const daysLeft = daysBetween(today, assignment.end);
    if (daysLeft < 0 || daysLeft > 7) continue;

    calls.push({
      id: `ending:${assignment.id}`,
      kind: "ending",
      toneColor: "#6E6959",
      kindLabel: "Ending soon",
      evidence: `${assignment.personName} · ${assignment.projectName} ends ${assignment.end}`,
      title: `${assignment.personName}'s work on ${assignment.projectName} ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      body: `Extend it two weeks if the work continues, or let it end and ${assignment.personName} frees ${assignment.alloc}%.`,
      actions: [
        {
          label: "Extend two weeks",
          detail: `${assignment.end} → ${addDays(assignment.end, 14)}`,
          primary: true,
          run: () => actions.updateAssignment(assignment.id, { work: assignment.work, alloc: assignment.alloc, start: assignment.start, end: addDays(assignment.end, 14) }),
        },
      ],
      personId: assignment.personId,
    });
  }

  const rankOf = { over: 0, unstaffed: 1, idle: 2, ending: 3 } as const;
  return calls.sort((a, b) => rankOf[a.kind] - rankOf[b.kind]).slice(0, maxCalls);
}

export function generateHeadline(people: Person[], projects: Project[], assignments: Assignment[], today: string): { headline: string; summary: string } {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const loadOf = (personId: string) => calculateLoad(personId, assignments, projectsById, today);
  const over = people.filter((p) => loadOf(p.id) > 100);
  const unstaffed = projects.filter((p) => p.state === "Active" && !assignments.some((a) => a.projectId === p.id && isActive(a, p, today)));
  const idle = people.filter((p) => loadOf(p.id) === 0);

  const joinNames = (names: string[]) => (names.length <= 1 ? names.join("") : names.length === 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

  let headline: string;
  if (over.length > 0) headline = `${joinNames(over.map((p) => p.name))} ${over.length > 1 ? "are" : "is"} past capacity.`;
  else if (unstaffed.length > 0) headline = `${joinNames(unstaffed.map((p) => p.name))} ${unstaffed.length > 1 ? "have" : "has"} nobody on it.`;
  else if (idle.length > 0) headline = `${joinNames(idle.map((p) => p.name))} ${idle.length > 1 ? "are" : "is"} free this week.`;
  else headline = "The week is balanced.";

  const liveProjects = projects.filter((p) => p.state === "Active");
  const avgLoad = people.length ? Math.round(people.reduce((s, p) => s + loadOf(p.id), 0) / people.length) : 0;
  const clauses: string[] = [];
  if (over.length > 0) clauses.push(`${joinNames(over.map((p) => p.name))} ${over.length > 1 ? "need" : "needs"} rebalancing`);
  if (unstaffed.length > 0) clauses.push(`${unstaffed.length} live project${unstaffed.length > 1 ? "s" : ""} ${unstaffed.length > 1 ? "have" : "has"} no one on ${unstaffed.length > 1 ? "them" : "it"}`);
  if (idle.length > 0) clauses.push(`${joinNames(idle.map((p) => p.name))} ${idle.length > 1 ? "have" : "has"} room`);
  const summary = `${clauses.length ? clauses.join("; ") + ". " : ""}The team is running at ${avgLoad}% overall across ${liveProjects.length} live projects.`;

  return { headline, summary };
}
