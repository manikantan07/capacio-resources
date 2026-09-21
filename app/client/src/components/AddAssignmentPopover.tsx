import { useLayoutEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useLiveProjects, useCreateAssignment } from "../features/queries";
import { SkillMatchBadge } from "./SkillMatchBadge";
import { NewProjectModal } from "./NewProjectModal";
import { useToast } from "./ToastProvider";
import { shouldOpenUpward } from "../lib/menuPlacement";
import { PlusIcon } from "./Icons";
import { color, radius } from "../theme";
import type { Project } from "../types";

interface AddAssignmentPopoverProps {
  personId: string;
  onClose: () => void;
}

export function AddAssignmentPopover({ personId, onClose }: AddAssignmentPopoverProps) {
  const { data: projects } = useLiveProjects();
  const createAssignment = useCreateAssignment();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Project | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [work, setWork] = useState("");
  const [alloc, setAlloc] = useState(25);
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const ref = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useLayoutEffect(() => {
    setOpenUpward(shouldOpenUpward(ref.current?.parentElement ?? null, 340));
  }, [selected]); // re-measure when the popover's content (and height) changes step

  const popoverStyle: React.CSSProperties = {
    position: "absolute",
    ...(openUpward ? { bottom: "100%", marginBottom: 6 } : { top: "100%", marginTop: 6 }),
    left: 0,
    width: 320,
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.card,
    boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
    padding: 14,
    zIndex: 50,
  };

  if (!selected) {
    return (
      <div ref={ref} style={popoverStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: color.textSecondary }}>Pick a project</div>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {projects?.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                border: "none",
                background: "none",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = color.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, flex: 1 }}>{p.name}</span>
              <SkillMatchBadge personId={personId} projectId={p.id} />
            </button>
          ))}
        </div>
        <button
          onClick={() => setNewProjectOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${color.hairline}`,
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 12.5,
            color: color.primaryText,
          }}
        >
          <PlusIcon /> New project
        </button>
        <NewProjectModal
          open={newProjectOpen}
          onClose={() => setNewProjectOpen(false)}
          onCreated={(project) => setSelected(project)}
        />
      </div>
    );
  }

  const submit = async () => {
    if (!work.trim()) return;
    try {
      await createAssignment.mutateAsync({ personId, projectId: selected.id, work, alloc, start, end });
      showToast(`Assigned to ${selected.name}`);
      onClose();
    } catch {
      showToast("Could not create assignment");
    }
  };

  return (
    <div ref={ref} style={popoverStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: color.textSecondary }}>{selected.name}</div>
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
          <TextField size="small" label="Start" type="date" value={start} onChange={(e) => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          <TextField size="small" label="End" type="date" value={end} onChange={(e) => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => setSelected(null)}>
            Back
          </Button>
          <Button size="small" variant="contained" onClick={submit} disabled={!work.trim() || createAssignment.isPending} fullWidth>
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}
