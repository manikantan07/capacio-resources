export const ALLOCATION_DATE_COLORS = {
  overdue: { background: "#800000", color: "#ffffff" },
  endingSoon: { background: "#ffbf00", color: "#161616" },
};

// Excel dates represent calendar days; TODAY() uses the viewer's local date.
export function allocationDateStatus(end: unknown, now = new Date()): keyof typeof ALLOCATION_DATE_COLORS | undefined {
  if (!(end instanceof Date) || !Number.isFinite(end.getTime())) return undefined;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const days = (endDay - today) / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 30) return "endingSoon";
  return undefined;
}
