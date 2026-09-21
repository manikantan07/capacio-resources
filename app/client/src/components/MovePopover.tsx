import { useLayoutEffect, useRef, useState } from "react";
import { useMovePreview, useReassignAssignment } from "../features/queries";
import { useToast } from "./ToastProvider";
import { shouldOpenUpward } from "../lib/menuPlacement";
import { bandColors, color, fontMono, radius } from "../theme";

interface MovePopoverProps {
  assignmentId: string;
  onClose: () => void;
}

export function MovePopover({ assignmentId, onClose }: MovePopoverProps) {
  const { data: previews } = useMovePreview(assignmentId);
  const reassign = useReassignAssignment();
  const { showToast } = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useLayoutEffect(() => {
    // parentElement is the trigger's positioning wrapper — measure it, not this popover itself
    setOpenUpward(shouldOpenUpward(ref.current?.parentElement ?? null, 260));
  }, []);

  const handlePick = async (personId: string, personName: string) => {
    try {
      await reassign.mutateAsync({ id: assignmentId, newPersonId: personId });
      showToast(`Moved to ${personName}`);
      onClose();
    } catch {
      showToast("Could not move assignment");
    }
  };

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        ...(openUpward ? { bottom: "100%", marginBottom: 6 } : { top: "100%", marginTop: 6 }),
        right: 0,
        width: 260,
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: radius.card,
        boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
        padding: 10,
        zIndex: 50,
        maxHeight: 300,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 600, color: color.textSecondary, padding: "2px 6px 8px" }}>Move to…</div>
      {previews?.map((p) => {
        const c = bandColors[p.projectedBand];
        return (
          <button
            key={p.personId}
            onClick={() => handlePick(p.personId, p.personName)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 8px",
              border: "none",
              background: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = color.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 12.5 }}>{p.personName}</span>
            <span style={{ fontFamily: fontMono, fontSize: 12, fontWeight: 600, color: c.base }}>
              {p.currentLoad}% → {p.projectedLoad}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
