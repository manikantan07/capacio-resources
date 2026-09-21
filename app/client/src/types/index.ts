export type PersonType = "FullTime" | "PartTime" | "Contract" | "Intern";
export type PersonStatus = "Active" | "OnLeave" | "SickLeave" | "NoticePeriod";
export type ProjectState = "Active" | "Backlog" | "Completed";
export type LoadBand = "Available" | "PartiallyAvailable" | "FullyAllocated" | "OverAllocated";
export type SkillMatchLevel = "None" | "Partial" | "Full";

export interface AssignmentSummary {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  work: string;
  alloc: number;
  start: string;
  end: string;
  active: boolean;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  type: PersonType;
  email: string;
  phone: string | null;
  location: string | null;
  status: PersonStatus;
  hours: string;
  joined: string | null;
  skills: string[];
  notes: string | null;
  load: number;
  band: LoadBand;
  bandLabel: string;
  bandShortLabel: string;
  assignments: AssignmentSummary[];
}

export interface ProjectPersonCell {
  personId: string;
  assignmentId: string;
  alloc: number;
  active: boolean;
  work: string;
  start: string;
  end: string;
}

export interface Project {
  id: string;
  name: string;
  owner: string | null;
  description: string | null;
  tech: string[];
  state: ProjectState;
  color: string;
  completedOn: string | null;
  totalStaffedPercent: number;
  headCount: number;
  band: LoadBand;
  cells: ProjectPersonCell[];
}

export interface Assignment {
  id: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  work: string;
  alloc: number;
  start: string;
  end: string;
  active: boolean;
  deadlineMissed: boolean;
  originalDeadline: string | null;
  extensionReason: string | null;
  backlogged: boolean;
}

export interface MovePreview {
  personId: string;
  personName: string;
  currentLoad: number;
  projectedLoad: number;
  projectedBand: LoadBand;
}

export interface SkillMatch {
  hit: string[];
  need: string[];
  missing: string[];
  level: SkillMatchLevel;
}

export interface Contributor {
  personId: string;
  personName: string;
  personRole: string;
  personColor: string | null;
  formerMember: boolean;
  workSummary: string;
  stintCount: number;
  periodStart: string;
  periodEnd: string;
  daysOnProject: number;
  peakAlloc: number;
  effortPersonDays: number;
}

export interface CompletedProject {
  id: string;
  name: string;
  owner: string | null;
  tech: string[];
  color: string;
  completedOn: string;
  resourceCount: number;
  totalEffortPersonDays: number;
  ranForDays: number;
  assignmentCount: number;
  contributors: Contributor[];
}

export interface CompletedStats {
  completedCount: number;
  totalEffortPersonDays: number;
  peopleInvolved: number;
  stillLiveCount: number;
  unstaffedLiveCount: number;
}

export interface MarkCompleteResult {
  freedCount: number;
  message: string;
}

export type ActivityActionType =
  | "PersonCreated" | "PersonUpdated" | "PersonDeleted"
  | "ProjectCreated" | "ProjectMarkedComplete" | "ProjectReopened"
  | "AssignmentCreated" | "AssignmentAllocUpdated" | "AssignmentEdited" | "AssignmentDeleted" | "AssignmentReassigned"
  | "AssignmentDeadlineExtended" | "AssignmentBacklogged"
  | "Undo";

export interface ActivityEntry {
  entityType: "Person" | "Project" | "Assignment";
  entityId: string;
  label: string;
  beforeJson: string | null;
  afterJson: string | null;
}

export interface ActivityLog {
  id: string;
  occurredAt: string;
  actorEmail: string;
  actionType: ActivityActionType;
  summary: string;
  entries: ActivityEntry[];
  undone: boolean;
  undoneAt: string | null;
  originalActivityId: string | null;
}

export interface ActivityHistoryPage {
  items: ActivityLog[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UndoOutcome {
  activityId: string;
  success: boolean;
  message: string;
}

export interface UndoActivitiesResult {
  outcomes: UndoOutcome[];
}
