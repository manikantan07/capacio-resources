import { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Popover from "@mui/material/Popover";
import { todayIso } from "../lib/allocationRules";
import { DEADLINE_CHANGE_TYPES, DEADLINE_REASONS } from "../lib/deadlineChanges";
import { useAssignments, useUpdateAssignment } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { color } from "../theme";
import type { Assignment, DeadlineChangeType } from "../types";

interface EditAssignmentPopoverProps {
  assignment: Assignment;
  projectCompleted: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function EditAssignmentPopover({ assignment, projectCompleted, anchorRef, onClose }: EditAssignmentPopoverProps) {
  const updateAssignment = useUpdateAssignment();
  const { data: assignments } = useAssignments();
  const { showToast } = useToast();
  const [work, setWork] = useState(assignment.work);
  const [alloc, setAlloc] = useState(assignment.alloc);
  const [start, setStart] = useState(assignment.start);
  const [end, setEnd] = useState(assignment.end);
  const latest = assignment.deadlineExtensions?.at(-1);
  const [recordChange, setRecordChange] = useState(false);
  const [previousDeadline, setPreviousDeadline] = useState(assignment.end);
  const [existing, setExisting] = useState({
    type: (latest?.changeType ?? "DeadlineMissed") as DeadlineChangeType | "",
    category: latest?.reasonCategory ?? "", description: latest?.reason ?? "",
  });
  const [newChange, setNewChange] = useState({ type: "" as DeadlineChangeType | "", category: "", description: "" });
  const endChanged = end !== assignment.end;
  const recordingChange = recordChange || endChanged;
  const showChangeFields = recordingChange || !!latest;
  const fields = recordingChange ? newChange : existing;
  const setFields = (patch: Partial<typeof newChange>) => {
    const setter = recordingChange ? setNewChange : setExisting;
    setter((current) => ({ ...current, ...patch }));
  };
  const reasonOptions = [...new Set([...DEADLINE_REASONS,
    ...(assignments ?? []).flatMap((a) => (a.deadlineExtensions ?? []).map((e) => e.reasonCategory).filter(Boolean)),
  ])];
  const invalidRange = !start || !end || end < start;
  const previous = recordingChange ? previousDeadline : latest?.previousDeadline ?? assignment.end;
  const revised = recordingChange ? end : latest?.newDeadline ?? assignment.end;
  const invalidPrevious = recordingChange && (!previous || previous < start || previous > assignment.end);
  const invalidType = showChangeFields && (
    !fields.type ||
    (fields.type === "DeadlineMissed" && (previous >= todayIso() || revised <= previous)) ||
    (fields.type === "DeadlineExtended" && revised <= previous)
  );
  const missingReason = recordingChange && !fields.category.trim();
  const invalid = !work.trim() || invalidRange || invalidPrevious || invalidType || missingReason;

  const submit = async () => {
    if (invalid) return;
    try {
      await updateAssignment.mutateAsync({ id: assignment.id, work, alloc, start, end,
        previousDeadline: recordingChange ? previousDeadline : undefined,
        deadlineChangeType: showChangeFields && fields.type ? fields.type : undefined,
        reasonCategory: showChangeFields ? fields.category.trim() : undefined,
        extensionReason: showChangeFields ? fields.description : undefined });
      showToast(`${assignment.projectName} assignment updated`);
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update assignment");
    }
  };

  return <Popover open anchorEl={() => anchorRef.current!} onClose={onClose}
    anchorOrigin={{ vertical: "top", horizontal: "right" }} transformOrigin={{ vertical: "bottom", horizontal: "right" }}
    marginThreshold={12} slotProps={{ paper: { sx: { width: 380, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100dvh - 24px)", borderRadius: "8px" } } }}>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: color.textSecondary }}>Edit assignment - {assignment.projectName}</div>
      {projectCompleted && <div style={{ fontSize: 12, color: color.textMuted }}>Project completed</div>}
      <TextField size="small" label="Work" value={work} onChange={(e) => setWork(e.target.value)} autoFocus />
      <TextField size="small" label="Allocation %" type="number" value={alloc}
        onChange={(e) => setAlloc(Math.max(5, Math.min(100, Number(e.target.value))))} />
      <div style={{ display: "flex", gap: 8 }}>
        <TextField size="small" label="Start" type="date" value={start} onChange={(e) => setStart(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} fullWidth />
        <TextField size="small" label="End" type="date" value={end} onChange={(e) => setEnd(e.target.value)}
          error={invalidRange} helperText={invalidRange ? "Choose an end date on or after start" : undefined}
          slotProps={{ inputLabel: { shrink: true } }} fullWidth />
      </div>
      <FormControlLabel sx={{ my: -0.5 }} control={<Checkbox size="small" checked={recordingChange} disabled={endChanged}
        onChange={(e) => setRecordChange(e.target.checked)} />}
        label={<span style={{ fontSize: 12 }}>{latest ? "Record another date change" : "Record date change"}</span>} />
      {showChangeFields && <>
        <div style={{ fontSize: 12, fontWeight: 600, color: color.textSecondary }}>{recordingChange ? "New date change" : "Latest date change"}</div>
        {recordingChange && <TextField size="small" label="Previous deadline" type="date" value={previousDeadline}
          onChange={(e) => setPreviousDeadline(e.target.value)} disabled={!!latest} error={invalidPrevious}
          slotProps={{ inputLabel: { shrink: true } }} />}
        <TextField select size="small" label="Change type" required value={fields.type} onChange={(e) => setFields({ type: e.target.value as DeadlineChangeType })}
          error={!!fields.type && invalidType} helperText={fields.type && invalidType ? fields.type === "DeadlineMissed" ? "The previous deadline must be in the past and before the new date" : "The new deadline must be later than the previous date" : undefined}>
          {Object.entries(DEADLINE_CHANGE_TYPES).map(([value, option]) => <MenuItem key={value} value={value}>{option.label}</MenuItem>)}
        </TextField>
        <Autocomplete freeSolo forcePopupIcon openOnFocus options={reasonOptions} inputValue={fields.category} value={fields.category || null}
          onInputChange={(_, value) => setFields({ category: value.slice(0, 120) })}
          onChange={(_, value) => setFields({ category: value ?? "" })}
          renderInput={(params) => <TextField {...params} size="small" label="Reason" required={recordingChange} placeholder="Select or enter a custom reason" />} />
        <TextField size="small" label="Additional description" multiline minRows={3} value={fields.description}
          onChange={(e) => setFields({ description: e.target.value })} slotProps={{ htmlInput: { maxLength: 2000 } }} />
      </>}
    </div>
    <div style={{ display: "flex", gap: 8, padding: "12px 16px", position: "sticky", bottom: 0, background: color.surface, borderTop: `1px solid ${color.divider}`, zIndex: 1 }}>
      <Button size="small" onClick={onClose}>Cancel</Button>
      <Button size="small" variant="contained" onClick={submit} disabled={invalid || updateAssignment.isPending} fullWidth>Save</Button>
    </div>
  </Popover>;
}
