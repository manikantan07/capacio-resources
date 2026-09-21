import { useSkillMatch } from "../features/queries";
import { color, radius } from "../theme";

const styles: Record<string, { bg: string; text: string; label: string }> = {
  Full: { bg: color.successSoft, text: color.successText, label: "Full match" },
  Partial: { bg: color.warningSoft, text: color.warningText, label: "Partial match" },
  None: { bg: color.dangerSoft, text: color.dangerText, label: "No match" },
};

export function SkillMatchBadge({ personId, projectId }: { personId: string; projectId: string }) {
  const { data } = useSkillMatch(personId, projectId);
  if (!data) return null;
  const s = styles[data.level];
  return (
    <span
      title={data.missing.length ? `Missing: ${data.missing.join(", ")}` : undefined}
      style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 6px", borderRadius: radius.badge, background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
