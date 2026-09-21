import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useExtendDeadline, useBacklogAssignment } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { color, radius } from "../theme";
import type { Assignment } from "../types";

interface ResolveDeadlinePopoverProps {
  assignment: Assignment;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * Two ways to resolve a missed deadline — they aren't the same action with different
 * labels: "Extend" commits to a new date, "Backlog" deliberately leaves it uncommitted.
 */
export function ResolveDeadlinePopover({ assignment, anchorRef, onClose }: ResolveDeadlinePopoverProps) {
  const extendDeadline = useExtendDeadline();
  const backlogAssignment = useBacklogAssignment();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"extend" | "backlog">("extend");
  const [newEnd, setNewEnd] = useState(assignment.end);
  const [reason, setReason] = useState("");
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right });
  }, [anchorRef]);

  const invalidEnd = mode === "extend" && newEnd < assignment.start;
  const pending = extendDeadline.isPending || backlogAssignment.isPending;

  const submit = async () => {
    try {
      if (mode === "extend") {
        if (invalidEnd) return;
        await extendDeadline.mutateAsync({ id: assignment.id, newEnd, reason: reason.trim() || undefined });
        showToast(`${assignment.projectName} deadline extended to ${newEnd}`);
      } else {
        await backlogAssignment.mutateAsync({ id: assignment.id, reason: reason.trim() || undefined });
        showToast(`${assignment.projectName} moved to backlog`);
      }
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not resolve the missed deadline");
    }
  };

  if (!pos) return null;

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: pos.bottom,
        right: pos.right,
        width: 300,
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: radius.card,
        boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
        padding: 14,
        zIndex: 1300,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: color.textSecondary }}>
        Deadline missed — {assignment.projectName}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <Button size="small" variant={mode === "extend" ? "contained" : "outlined"} onClick={() => setMode("extend")} fullWidth>
          Extend
        </Button>
        <Button size="small" variant={mode === "backlog" ? "contained" : "outlined"} onClick={() => setMode("backlog")} fullWidth>
          Move to backlog
        </Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mode === "extend" ? (
          <TextField
            size="small"
            label="New end date"
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            error={invalidEnd}
            helperText={invalidEnd ? "End before start" : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        ) : (
          <div style={{ fontSize: 11, lineHeight: 1.4, background: color.hairline, color: color.textMeta, borderRadius: 7, padding: "8px 10px" }}>
            Parks the work with no committed date — it stops counting toward capacity until it's reassigned with new dates.
          </div>
        )}
        <TextField
          size="small"
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={submit} disabled={pending || invalidEnd} fullWidth>
            {mode === "extend" ? "Extend deadline" : "Move to backlog"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
