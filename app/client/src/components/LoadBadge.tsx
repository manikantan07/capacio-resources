import type { LoadBand } from "../types";
import { bandColors, fontMono, radius } from "../theme";

interface LoadBadgeProps {
  band: LoadBand;
  label: string;
}

export function LoadBadge({ band, label }: LoadBadgeProps) {
  const c = bandColors[band];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: radius.pill,
        background: c.bg,
        color: c.text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function LoadValue({ load, band }: { load: number; band: LoadBand }) {
  const c = bandColors[band];
  return (
    <span style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: c.base }}>{load}%</span>
  );
}
