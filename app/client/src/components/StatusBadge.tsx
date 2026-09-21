import { STATUS_LABEL } from "../lib/labels";
import { statusColors, radius } from "../theme";
import type { Person } from "../types";

/**
 * Status only earns a badge when it's not the default "Active" — healthy/normal state
 * stays visually quiet, exceptions (on leave, sick, notice) surface. Two sizes: a text
 * pill for roomy rows, a plain dot for tight spaces like a matrix column header.
 */

export function StatusBadge({ status }: { status: Person["status"] }) {
  if (status === "Active") return null;
  const c = statusColors[status];
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: radius.pill,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: Person["status"] }) {
  if (status === "Active") return null;
  const c = statusColors[status];
  return (
    <span
      title={STATUS_LABEL[status]}
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: c.text,
        border: "1.5px solid #fff",
      }}
    />
  );
}
