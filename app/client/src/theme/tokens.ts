// Design tokens ported from design_handoff_capcio/README.md ("Design Tokens" section).
// Token *names* are kept stable from the previous (DeliveryHub) theme so every
// consuming component re-skins automatically; only *values* change here, plus two new
// roles (`accent`/`info`) needed because Capcio splits "brand action color" (red-orange)
// from "Free-capacity band color" (blue) — the old theme conflated both into `primary`.

export const color = {
  // Accent = brand/action color (buttons, active nav, focus, "Over capacity" band).
  primary: "#E8442A",
  primarySoft: "#FBE9E4",
  primaryText: "#C4341F",
  primaryHoverDark: "#C4341F",

  // Info = the Capcio "Free" band blue — kept distinct from the accent above.
  info: "#2A62D6",
  infoSoft: "#E8EEFC",
  infoText: "#2A62D6",

  success: "#0E9A63",
  successSoft: "#E1F3EA",
  successText: "#0E9A63",

  warning: "#8F7210",
  warningSoft: "#F3EEDD",
  warningText: "#8F7210",

  danger: "#E8442A",
  dangerSoft: "#FBE9E4",
  dangerText: "#C4341F",

  neutral: "#8B8677",
  neutralSoft: "#E7E2D7",
  neutralText: "#6E6959",

  page: "#F4F1EA",
  surface: "#FFFFFF",
  surfaceSubtle: "#F1EDE3",
  hover: "#F1EDE3",
  border: "#E3DDD0",
  controlBorder: "#DCD5C6",
  divider: "#DFD9CB",
  hairline: "#E7E2D7",
  hairline2: "#EDE9DF",

  textPrimary: "#16150F",
  textBody: "#16150F",
  textSecondary: "#46423A",
  textMuted: "#6E6959",
  textLabel: "#6E6959",
  textTertiary: "#7B7667",
  textMeta: "#8B8677",
  textCount: "#A8A190",
  textFaint: "#B7AF9C",
  textDisabled: "#C9C1AF",
  textDisabled2: "#DCD5C6",
} as const;

// Fixed per-project colors — people learn these, don't reassign by index churn.
export const palette = [
  "#2A62D6", "#0E9A63", "#C05A15", "#6C42C7", "#0E8A91", "#BF2C60",
  "#8F7210", "#4451C9", "#12907C", "#8E3FC4", "#87613F", "#5B6E7A",
];

export const statusColors = {
  Active: { bg: "#FFFFFF", text: "#46423A", border: "#DCD5C6" },
  OnLeave: { bg: "#F3EEDD", text: "#8F7210", border: "#E3D9B0" },
  SickLeave: { bg: "#FBE9E4", text: "#C4341F", border: "#F0C9BF" },
  NoticePeriod: { bg: "#E7E2D7", text: "#6E6959", border: "#DCD5C6" },
} as const;

// Capcio band names: OVER / FULL / OPEN / FREE — same 4 states as before, recolored.
export const bandColors = {
  OverAllocated: { bg: color.dangerSoft, text: color.dangerText, base: color.danger },
  FullyAllocated: { bg: color.warningSoft, text: color.warningText, base: color.warning },
  PartiallyAvailable: { bg: color.successSoft, text: color.successText, base: color.success },
  Available: { bg: color.infoSoft, text: color.infoText, base: color.info },
} as const;

export const radius = {
  card: 11,
  statCard: 11,
  input: 8,
  button: 8,
  pill: 5,
  badge: 4,
};

export const spacing = {
  page: 26,
  card: 18,
  row: 16,
  cardGap: 14,
  gridGap: 12,
  controlGap: 10,
};

export const fontMono = '"JetBrains Mono", ui-monospace, monospace';
export const fontSans = '"Archivo", -apple-system, BlinkMacSystemFont, sans-serif';
