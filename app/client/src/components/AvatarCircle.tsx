interface AvatarCircleProps {
  initials: string;
  color: string;
  size?: number;
}

export function AvatarCircle({ initials, color, size = 34 }: AvatarCircleProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size <= 28 ? 11 : 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
