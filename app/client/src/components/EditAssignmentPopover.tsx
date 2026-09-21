import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useUpdateAssignment } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { color, radius } from "../theme";
import type { Assignment } from "../types";

interface EditAssignmentPopoverProps {
  assignment: Assignment;
  projectCompleted: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function EditAssignmentPopover({ assignment, projectCompleted, anchorRef, onClose }: EditAssignmentPopoverProps) {
  const updateAssignment = useUpdateAssignment();
  const { showToast } = useToast();
  const [work, setWork] = useState(assignment.work);
  const [alloc, setAlloc] = useState(assignment.alloc);
  const [start, setStart] = useState(assignment.start);
  const [end, setEnd] = useState(assignment.end);
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right });
  }, [anchorRef]);

  const invalidRange = end < start;

  const submit = async () => {
    if (!work.trim() || invalidRange) return;
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, work, alloc, start, end });
      showToast(`${assignment.projectName} assignment updated`);
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update assignment");
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
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: color.textSecondary }}>Edit assignment — {assignment.projectName}</div>
      {projectCompleted && (
        <div style={{ fontSize: 11, lineHeight: 1.4, background: color.hairline, color: color.textMeta, borderRadius: 7, padding: "8px 10px", marginBottom: 10 }}>
          "{assignment.projectName}" is completed — this change won't count toward capacity anywhere in the app until the project is reopened.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <TextField size="small" label="Work" value={work} onChange={(e) => setWork(e.target.value)} autoFocus />
        <TextField
          size="small"
          label="Allocation %"
          type="number"
          value={alloc}
          onChange={(e) => setAlloc(Math.max(5, Math.min(100, Number(e.target.value))))}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <TextField
            size="small"
            label="Start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            size="small"
            label="End"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            error={invalidRange}
            helperText={invalidRange ? "End before start" : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={submit} disabled={!work.trim() || invalidRange || updateAssignment.isPending} fullWidth>
            Save
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
