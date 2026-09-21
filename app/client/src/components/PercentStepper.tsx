import { color, fontMono } from "../theme";

interface PercentStepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function PercentStepper({ value, onChange, step = 25, min = 5, max = 100 }: PercentStepperProps) {
  const buttonStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    border: `1px solid ${color.controlBorder}`,
    background: color.surface,
    borderRadius: 5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: color.textSecondary,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        style={buttonStyle}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Decrease allocation"
      >
        −
      </button>
      <span style={{ fontFamily: fontMono, fontSize: 13, minWidth: 34, textAlign: "center" }}>{value}%</span>
      <button
        type="button"
        style={buttonStyle}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Increase allocation"
      >
        +
      </button>
    </div>
  );
}
