import { color, fontMono, radius } from "../theme";

interface StatCardProps {
  dotColor: string;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  subColor?: string;
}

export function StatCard({ dotColor, label, value, unit, sub, subColor }: StatCardProps) {
  return (
    <div
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: radius.statCard,
        padding: "13px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em", color: color.textTertiary, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: fontMono, fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", color: color.textPrimary }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, fontWeight: 500, color: color.textMeta }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11.5, marginTop: 4, color: subColor ?? color.textMeta }}>{sub}</div>}
    </div>
  );
}
