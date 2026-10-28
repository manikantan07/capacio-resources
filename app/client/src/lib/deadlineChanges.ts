import { color } from "../theme";
import type { DeadlineChangeType, DeadlineExtension } from "../types";

export const DEADLINE_CHANGE_TYPES: Record<DeadlineChangeType, { label: string; text: string; background: string }> = {
  DeadlineMissed: { label: "Deadline missed", text: color.dangerText, background: color.dangerSoft },
  DeadlineExtended: { label: "Deadline extended", text: color.infoText, background: color.infoSoft },
  Rescheduled: { label: "Rescheduled", text: color.infoText, background: color.infoSoft },
  Backlog: { label: "Backlog", text: color.warningText, background: color.warningSoft },
  OnHold: { label: "On hold", text: color.warningText, background: color.warningSoft },
  TentativeDeadline: { label: "Tentative deadline", text: color.neutralText, background: color.neutralSoft },
};

export const DEADLINE_REASONS = [
  "Development issue", "New client requirements", "Scope change", "Business team date change",
  "Client date change", "Undecided deadline / placeholder date", "Awaiting client feedback",
  "Awaiting approval", "Dependency / third-party delay", "Resource availability / leave",
  "Priority change / backlog", "Testing / bug fixes", "Content / assets pending",
  "Access / environment issue", "Release / deployment rescheduled",
];

export function deadlineStyle(extension?: DeadlineExtension) {
  return DEADLINE_CHANGE_TYPES[extension?.changeType ?? "DeadlineMissed"] ?? DEADLINE_CHANGE_TYPES.DeadlineMissed;
}
