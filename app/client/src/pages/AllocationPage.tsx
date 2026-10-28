import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Popover from "@mui/material/Popover";
import { Shell } from "../components/Shell";
import { StatusBadge } from "../components/StatusBadge";
import { NewProjectModal } from "../components/NewProjectModal";
import { CloseIcon, PlusIcon, PencilIcon } from "../components/Icons";
import { EditAssignmentPopover } from "../components/EditAssignmentPopover";
import { DeadlineBadge, DeadlineHistory } from "../components/DeadlineHistory";
import { deadlineStyle } from "../lib/deadlineChanges";
import {
  usePeople,
  useLiveProjects,
  useAssignments,
  useCreateAssignment,
  useUpdateAlloc,
  useDeleteAssignment,
  useReassignAssignment,
  useCompleteAssignment,
} from "../features/queries";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastProvider";
import { ApiError } from "../api/client";
import { calculateLoad, getLoadBand, BAND_WORD, todayIso, isActive, isTentative, fit } from "../lib/allocationRules";
import { hexToRgba } from "../lib/color";
import { color, fontMono, bandColors, radius } from "../theme";
import type { Assignment, Person, Project } from "../types";

const UNIT = 2.8; // px per percent
const BOARD_PERCENT = 142;
const BOARD_HEIGHT = BOARD_PERCENT * UNIT;

function MovePopover({
  assignment,
  people,
  projectsById,
  assignments,
  today,
  anchorRef,
  onClose,
}: {
  assignment: Assignment;
  people: Person[];
  projectsById: Map<string, Project>;
  assignments: Assignment[];
  today: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const reassignAssignment = useReassignAssignment();
  const { showToast } = useToast();
  const project = projectsById.get(assignment.projectId);
  const assignmentIsLive = project ? isActive(assignment, project, today) : false;

  const others = people
    .filter((p) => p.id !== assignment.personId)
    .map((p) => {
      const currentLoad = calculateLoad(p.id, assignments, projectsById, today);
      const projectedLoad = assignmentIsLive ? currentLoad + assignment.alloc : currentLoad;
      return { person: p, currentLoad, projectedLoad, band: getLoadBand(projectedLoad) };
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name));

  // MUI Popover portals to <body>, so the list can't be clipped by the board's
  // scrolling/overflow containers, and it repositions to stay inside the viewport.
  return (
    <Popover
      open
      anchorEl={() => anchorRef.current!}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      marginThreshold={12}
      slotProps={{
        paper: {
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
          style: {
            marginTop: -6,
            width: 280,
            maxHeight: 260,
            overflowY: "auto",
            background: color.surface,
            border: `1px solid ${color.controlBorder}`,
            borderRadius: radius.card,
            padding: 6,
            boxShadow: "0 18px 44px rgba(72,62,42,.18)",
          },
        },
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: color.textTertiary, padding: "8px 9px 7px" }}>
        Move to · resulting load
      </div>
      {others.map((o) => (
        <button
          key={o.person.id}
          onClick={() => {
            reassignAssignment.mutate({ id: assignment.id, newPersonId: o.person.id });
            showToast(`Moved ${assignment.projectName} to ${o.person.name}`);
            onClose();
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 9px",
            border: "none",
            background: "none",
            borderRadius: 6,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = color.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: 12 }}>{o.person.name}</span>
          <span style={{ fontFamily: fontMono, fontSize: 11.5, fontWeight: 500, color: bandColors[o.band].base }}>{o.projectedLoad}%</span>
        </button>
      ))}
    </Popover>
  );
}

function AssignWorkPopover({
  person,
  projects,
  onClose,
}: {
  person: Person;
  projects: Project[];
  onClose: () => void;
}) {
  const { data: liveAssignments } = useAssignments();
  const createAssignment = useCreateAssignment();
  const { showToast } = useToast();
  const today = todayIso();
  const [selected, setSelected] = useState<Project | null>(null);
  const [work, setWork] = useState("");
  const [alloc, setAlloc] = useState(25);

  const assignments = liveAssignments ?? [];
  const inactive = new Set(assignments.filter((a) => a.personId === person.id).map((a) => a.projectId));
  const options = projects.filter((p) => !inactive.has(p.id));

  if (!selected) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", right: 0, bottom: "100%", marginBottom: 6, width: 290, maxHeight: 270, overflowY: "auto", background: color.surface, border: `1px solid ${color.controlBorder}`, borderRadius: radius.card, padding: 6, zIndex: 40, boxShadow: "0 18px 44px rgba(72,62,42,.18)" }}
      >
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: color.textTertiary, padding: "8px 9px 7px" }}>
          Live projects · skill fit
        </div>
        {options.map((p) => {
          const f = fit(person, p);
          const tagStyle =
            f.level === "Full"
              ? { bg: color.successSoft, text: color.successText, label: "Full fit" }
              : f.level === "Partial"
                ? { bg: color.warningSoft, text: color.warningText, label: `${f.hit.length}/${f.need.length}` }
                : { bg: color.dangerSoft, text: color.dangerText, label: "No fit" };
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", border: "none", background: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = color.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "3px 6px", borderRadius: 4, background: tagStyle.bg, color: tagStyle.text }}>{tagStyle.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const submit = () => {
    if (!work.trim()) return;
    createAssignment.mutate({
      personId: person.id,
      projectId: selected.id,
      work,
      alloc,
      start: today,
      end: today,
    });
    showToast(`Assigned to ${selected.name}`);
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", right: 0, bottom: "100%", marginBottom: 6, width: 290, background: color.surface, border: `1px solid ${color.controlBorder}`, borderRadius: radius.card, padding: 14, zIndex: 40, boxShadow: "0 18px 44px rgba(72,62,42,.18)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{selected.name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input placeholder="Work" value={work} onChange={(e) => setWork(e.target.value)} style={inputStyle} autoFocus />
        <input type="number" placeholder="Allocation %" value={alloc} onChange={(e) => setAlloc(Math.max(5, Math.min(100, Number(e.target.value))))} style={inputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setSelected(null)} style={ghostButtonStyle}>Back</button>
          <button onClick={submit} disabled={!work.trim()} style={{ ...primaryButtonStyle, flex: 1, opacity: !work.trim() ? 0.5 : 1 }}>Assign</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 34, padding: "0 10px", border: `1px solid ${color.controlBorder}`, borderRadius: 7, fontSize: 12.5, fontFamily: "inherit" };
const ghostButtonStyle: React.CSSProperties = { height: 34, padding: "0 12px", border: `1px solid ${color.controlBorder}`, background: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" };
const primaryButtonStyle: React.CSSProperties = { height: 34, padding: "0 12px", border: "none", background: color.primary, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" };

function ChartColumn({
  person,
  assignments,
  projectsById,
  today,
  selected,
  hoveredProjectId,
  onSelect,
  onHoverProject,
}: {
  person: Person;
  assignments: Assignment[];
  projectsById: Map<string, Project>;
  today: string;
  selected: boolean;
  hoveredProjectId: string | null;
  onSelect: () => void;
  onHoverProject: (id: string | null) => void;
}) {
  const live = assignments.filter((a) => a.personId === person.id && isActive(a, projectsById.get(a.projectId), today)).sort((a, b) => b.alloc - a.alloc);
  const load = live.reduce((s, a) => s + a.alloc, 0);
  const band = getLoadBand(load);
  const bandColor = bandColors[band].base;

  let cumulative = 0;
  const positioned = live.map((a) => {
    const bottom = cumulative;
    const height = a.alloc * UNIT;
    cumulative += height;
    return { a, bottom, height };
  });

  // Tentative (unconfirmed) work stacks on top of the confirmed load, striped, so you can
  // see what it would take up — but it isn't part of `load`.
  const tentative = assignments.filter((a) => a.personId === person.id && isTentative(a, projectsById.get(a.projectId), today)).sort((a, b) => b.alloc - a.alloc);
  const tentativeLoad = tentative.reduce((s, a) => s + a.alloc, 0);
  let tentativeTop = cumulative;
  const positionedTentative = tentative.map((a) => {
    const bottom = tentativeTop;
    const height = a.alloc * UNIT;
    tentativeTop += height;
    return { a, bottom, height };
  });

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
      <button
        onClick={onSelect}
        style={{ position: "relative", height: BOARD_HEIGHT, background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%" }}
      >
        {/* free capacity */}
        {load < 100 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: cumulative,
              height: (100 - load) * UNIT - 2,
              border: `1px dashed ${color.textDisabled}`,
              borderRadius: 4,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              padding: "0 6px 4px",
            }}
          >
            <span style={{ fontFamily: fontMono, fontSize: 9, color: color.textTertiary }}>{100 - load}% free</span>
          </div>
        )}

        {/* overflow band */}
        {load > 100 && (
          <div
            style={{
              position: "absolute",
              left: -1,
              right: -1,
              bottom: 100 * UNIT,
              height: (load - 100) * UNIT,
              border: `1px solid ${color.primary}`,
              borderRadius: 4,
              zIndex: 3,
              backgroundImage: `repeating-linear-gradient(135deg, ${hexToRgba(color.primary, 0.26)} 0 5px, ${hexToRgba(color.primary, 0.07)} 5px 10px)`,
            }}
          />
        )}
        {load > 100 && (
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: load * UNIT + 6,
              zIndex: 4,
              background: color.primary,
              color: "#fff",
              fontFamily: fontMono,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            +{load - 100}%
          </span>
        )}

        {/* segments */}
        {positioned.map(({ a, bottom, height }) => {
          const project = projectsById.get(a.projectId);
          const dimmed = hoveredProjectId !== null && hoveredProjectId !== a.projectId;
          const base = project?.color ?? color.neutral;
          return (
            <div
              key={a.id}
              title={`${a.projectName} · ${a.work} · ${a.alloc}% · ${a.start} → ${a.end}${a.deadlineExtensions?.length ? ` · ${deadlineStyle(a.deadlineExtensions.at(-1)).label}` : ""}`}
              onMouseEnter={() => onHoverProject(a.projectId)}
              onMouseLeave={() => onHoverProject(null)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom,
                height,
                background: dimmed ? hexToRgba(base, 0.05) : hexToRgba(base, 0.15),
                border: `1px solid ${dimmed ? hexToRgba(base, 0.16) : hexToRgba(base, 0.52)}`,
                borderRadius: 4,
                boxSizing: "border-box",
                borderLeft: a.deadlineExtensions?.length ? `3px solid ${deadlineStyle(a.deadlineExtensions.at(-1)).text}` : undefined,
                overflow: "hidden",
                padding: "5px 7px",
                opacity: dimmed ? 0.5 : 1,
                transition: "opacity .16s, background .16s",
                textAlign: "left",
              }}
            >
              {height >= 30 && (
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: base, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {project?.name ?? a.projectName}
                </div>
              )}
              {height >= 52 && (
                <div style={{ fontFamily: fontMono, fontSize: 11, color: base, opacity: 0.72, marginTop: 2 }}>{a.alloc}%</div>
              )}
              {!!a.deadlineExtensions?.length && height >= 88 && <div style={{ marginTop: 8 }}><DeadlineBadge extension={a.deadlineExtensions.at(-1)} /></div>}
            </div>
          );
        })}

        {positionedTentative.map(({ a, bottom, height }) => {
          const project = projectsById.get(a.projectId);
          const base = project?.color ?? color.neutral;
          const dimmed = hoveredProjectId !== null && hoveredProjectId !== a.projectId;
          return (
            <div
              key={a.id}
              title={`Tentative — not counted · ${a.projectName} · ${a.work} · ${a.alloc}% · ${a.start} → ${a.end}`}
              onMouseEnter={() => onHoverProject(a.projectId)}
              onMouseLeave={() => onHoverProject(null)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom,
                height,
                zIndex: 2,
                backgroundImage: `repeating-linear-gradient(135deg, ${hexToRgba(base, 0.16)} 0 5px, ${hexToRgba(base, 0.04)} 5px 10px)`,
                backgroundColor: color.surface,
                border: `1px dashed ${hexToRgba(base, 0.6)}`,
                borderRadius: 4,
                boxSizing: "border-box",
                overflow: "hidden",
                padding: "5px 7px",
                opacity: dimmed ? 0.4 : 1,
                transition: "opacity .16s",
                textAlign: "left",
              }}
            >
              {height >= 30 && (
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: base, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {project?.name ?? a.projectName}
                </div>
              )}
              {height >= 52 && (
                <div style={{ fontFamily: fontMono, fontSize: 10, color: base, opacity: 0.8, marginTop: 2 }}>{a.alloc}% · tentative</div>
              )}
            </div>
          );
        })}

        {/* gridline reference (0-line) */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderTop: `1px solid ${color.divider}` }} />
      </button>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${selected ? color.primary : color.controlBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: selected ? color.primary : color.neutralSoft, color: selected ? "#fff" : color.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
            {person.initials}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? "#000" : color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</span>
        </div>
        <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: fontMono, fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", color: bandColor }}>{load}%</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: bandColor }}>{BAND_WORD[band]}</span>
        </div>
        {tentativeLoad > 0 && (
          <div
            title={`If confirmed: ${load + tentativeLoad}%`}
            style={{ marginTop: 3, fontFamily: fontMono, fontSize: 10, color: load + tentativeLoad > 100 ? color.dangerText : color.textMeta }}
          >
            +{tentativeLoad}% tentative
          </div>
        )}
      </div>
    </div>
  );
}

export function AllocationPage() {
  const { data: people, isLoading } = usePeople();
  const { data: projects } = useLiveProjects();
  const { data: liveAssignments } = useAssignments();
  const updateAlloc = useUpdateAlloc();
  const deleteAssignment = useDeleteAssignment();
  const completeAssignment = useCompleteAssignment();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [sort, setSort] = useState<"Load" | "Name">("Load");
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deadlineId, setDeadlineId] = useState<string | null>(null);
  const editAnchorRef = useRef<HTMLDivElement | null>(null);
  const moveAnchorRef = useRef<HTMLDivElement | null>(null);
  const [assigningPersonId, setAssigningPersonId] = useState<string | null>(null);
  const today = todayIso();

  const assignments = liveAssignments ?? [];
  const projectsById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(searchParams.get("person"));

  const sortedPeople = useMemo(() => {
    if (!people) return [];
    const list = [...people];
    if (sort === "Name") return list.sort((a, b) => a.name.localeCompare(b.name));
    return list.sort((a, b) => calculateLoad(b.id, assignments, projectsById, today) - calculateLoad(a.id, assignments, projectsById, today));
  }, [people, sort, assignments, projectsById, today]);

  const overCapacityCount = people?.filter((p) => calculateLoad(p.id, assignments, projectsById, today) > 100).length ?? 0;
  const fullyFreeCount = people?.filter((p) => calculateLoad(p.id, assignments, projectsById, today) === 0).length ?? 0;
  const teamLoad = people && people.length ? Math.round(people.reduce((s, p) => s + calculateLoad(p.id, assignments, projectsById, today), 0) / people.length) : 0;

  const selectedPerson = people?.find((p) => p.id === selectedPersonId) ?? null;
  const selectedAssignments = selectedPerson ? assignments.filter((a) => a.personId === selectedPerson.id) : [];
  const selectedLoad = selectedPerson ? calculateLoad(selectedPerson.id, assignments, projectsById, today) : 0;
  const selectedBand = getLoadBand(selectedLoad);

  return (
    <Shell className="allocation-shell" title="Allocation" subtitle="The whole team's week, at a glance" actionLabel={isOwner ? "New project" : undefined} onAction={() => setNewProjectOpen(true)}>
      {isLoading && <div style={{ color: color.textMuted, fontSize: 13 }}>Loading…</div>}

      {people && projects && (
        <div className="allocation-layout" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Readout strip */}
          <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${color.divider}`, paddingBottom: 4, marginBottom: 8, flexWrap: "wrap" }}>
            {[
              { key: "Team load", value: `${teamLoad}`, suffix: "%", c: color.textPrimary },
              { key: "Over capacity", value: `${overCapacityCount}`, suffix: overCapacityCount === 1 ? "person" : "people", c: overCapacityCount > 0 ? color.primary : color.textMeta },
              { key: "Fully free", value: `${fullyFreeCount}`, suffix: fullyFreeCount === 1 ? "person" : "people", c: fullyFreeCount > 0 ? color.info : color.textMeta },
              { key: "Live projects", value: `${projects.length}`, suffix: "", c: color.textPrimary },
            ].map((cell) => (
              <div key={cell.key} style={{ padding: "17px 30px 12px 0", marginRight: 30, borderRight: `1px solid ${color.divider}`, minWidth: 110 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontFamily: "inherit", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.9, color: cell.c }}>{cell.value}</span>
                  {cell.suffix && <span style={{ fontSize: 13, fontWeight: 600, color: color.textMeta }}>{cell.suffix}</span>}
                </div>
                <div style={{ marginTop: 6, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: color.textMuted }}>{cell.key}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: color.textMeta }}>Sort</span>
              {(["Load", "Name"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  style={{
                    height: 26,
                    padding: "0 11px",
                    borderRadius: 7,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    border: `1px solid ${sort === s ? color.primary : color.controlBorder}`,
                    background: sort === s ? color.primary : "transparent",
                    color: sort === s ? "#fff" : color.textMuted,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="allocation-chart" style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <div style={{ minWidth: 820, position: "relative", paddingLeft: 46, paddingTop: 10 }}>
              {/* gridlines */}
              {[0, 50, 100].map((v) => (
                <div key={v} style={{ position: "absolute", left: 46, right: 0, bottom: v * UNIT, height: 0 }}>
                  <div
                    style={{
                      borderTop: v === 100 ? `1px dashed ${color.primary}` : v === 50 ? `1px dotted ${color.divider}` : `1px solid ${color.divider}`,
                    }}
                  />
                  <span style={{ position: "absolute", left: -46, width: 40, textAlign: "right", transform: "translateY(-50%)", fontFamily: fontMono, fontSize: 10, color: v === 100 ? color.primary : color.textCount }}>
                    {v}
                  </span>
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", position: "relative" }}>
                {sortedPeople.map((p) => (
                  <ChartColumn
                    key={p.id}
                    person={p}
                    assignments={assignments}
                    projectsById={projectsById}
                    today={today}
                    selected={p.id === selectedPersonId}
                    hoveredProjectId={hoveredProjectId}
                    onSelect={() => setSelectedPersonId(p.id)}
                    onHoverProject={setHoveredProjectId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          {selectedPerson && (
            <div style={{ borderTop: `1px solid ${color.divider}`, background: color.surfaceSubtle, padding: "16px 4px 4px", marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{selectedPerson.name}</span>
                <StatusBadge status={selectedPerson.status} />
                <span style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 500, color: bandColors[selectedBand].base }}>{selectedLoad}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 5, background: hexToRgba(bandColors[selectedBand].base, 0.13), color: bandColors[selectedBand].base }}>
                  {selectedBand === "OverAllocated" ? "Over capacity" : selectedBand === "FullyAllocated" ? "Fully booked" : selectedBand === "PartiallyAvailable" ? "Has room" : "Available"}
                </span>
                <span style={{ fontSize: 11.5, color: color.textMuted }}>
                  {selectedBand === "OverAllocated"
                    ? `${selectedLoad - 100}% beyond capacity — move something out`
                    : selectedBand === "FullyAllocated"
                      ? "No spare capacity this week"
                      : `${100 - selectedLoad}% of the week unbooked`}
                </span>
                <div style={{ flex: 1 }} />
                {isOwner && (
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setAssigningPersonId(assigningPersonId === selectedPerson.id ? null : selectedPerson.id)} style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 13px", border: `1px solid ${color.controlBorder}`, background: color.surface, borderRadius: 8, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                      <PlusIcon /> Assign work
                    </button>
                    {assigningPersonId === selectedPerson.id && <AssignWorkPopover person={selectedPerson} projects={projects} onClose={() => setAssigningPersonId(null)} />}
                  </div>
                )}
              </div>

              <div className="allocation-assignments" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {selectedAssignments.length === 0 && (
                  <div style={{ padding: "18px 12px", border: `1px dashed ${color.controlBorder}`, borderRadius: 10, fontSize: 12, color: color.textTertiary }}>
                    {selectedPerson.name} has nothing booked. Assign work to fill the week.
                  </div>
                )}
                {selectedAssignments.map((a) => (
                  (() => {
                    const project = projectsById.get(a.projectId);
                    // useLiveProjects() never returns completed projects, so absence here means completed.
                    const isCompletedProject = !project;
                    const rowIsActive = isActive(a, project, today);
                    const projectIsTentative = project?.state === "Tentative";
                    return (
                  <div key={a.id} className="allocation-assignment-row" style={{ display: "grid", gap: 12, alignItems: "center", background: color.surface, border: `1px solid ${color.hairline}`, borderLeft: a.deadlineExtensions?.length ? `3px solid ${deadlineStyle(a.deadlineExtensions.at(-1)).text}` : undefined, borderRadius: 8, padding: "10px 12px", position: "relative" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: project?.color ?? color.neutral }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.projectName}</span>
                      {projectIsTentative && (
                        <span
                          title="Project not confirmed yet — shown on the board but doesn't count toward capacity. Confirm it on the Projects page."
                          style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 4, border: `1px dashed ${color.textMeta}`, color: color.textMuted, flexShrink: 0 }}
                        >
                          Tentative
                        </span>
                      )}
                      {!rowIsActive && !projectIsTentative && (
                        <span
                          title={
                            isCompletedProject
                              ? "This project is completed — doesn't count toward capacity until reopened"
                              : "Outside this assignment's date range — doesn't count toward capacity right now"
                          }
                          style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: color.hairline, color: color.textMeta, flexShrink: 0 }}
                        >
                          {isCompletedProject ? "Completed" : "Not active"}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.work}</span>
                    <div style={{ fontSize: 11, color: color.textMuted }}>
                      <span style={{ fontFamily: fontMono }}>{a.start} → {a.end}</span>
                      {!!a.deadlineExtensions?.length && <div style={{ marginTop: 5 }}><DeadlineBadge extension={a.deadlineExtensions.at(-1)} onClick={() => setDeadlineId(a.id)} /></div>}
                    </div>
                    {isOwner ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button onClick={() => updateAlloc.mutate({ id: a.id, alloc: Math.max(5, a.alloc - 5) })} style={stepperButtonStyle}>−</button>
                        <span style={{ fontFamily: fontMono, fontSize: 12.5, width: 40, textAlign: "center" }}>{a.alloc}%</span>
                        <button onClick={() => updateAlloc.mutate({ id: a.id, alloc: Math.min(100, a.alloc + 5) })} style={stepperButtonStyle}>+</button>
                      </div>
                    ) : (
                      <span style={{ fontFamily: fontMono, fontSize: 12.5 }}>{a.alloc}%</span>
                    )}
                    {isOwner ? (
                      <div ref={(el) => { if (a.id === editingId) editAnchorRef.current = el; }}>
                        <button onClick={() => setEditingId(editingId === a.id ? null : a.id)} title="Edit dates" style={{ width: 26, height: 26, border: `1px solid ${color.controlBorder}`, borderRadius: 7, background: color.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: color.textMuted }}>
                          <PencilIcon />
                        </button>
                        {editingId === a.id && (
                          <EditAssignmentPopover
                            assignment={a}
                            projectCompleted={isCompletedProject}
                            anchorRef={editAnchorRef}
                            onClose={() => setEditingId(null)}
                          />
                        )}
                      </div>
                    ) : (
                      <span />
                    )}
                    {isOwner ? (
                      <div ref={(el) => { if (a.id === movingId) moveAnchorRef.current = el; }} style={{ display: "flex", gap: 6 }}>
                        {rowIsActive && (
                          <button
                            onClick={async () => {
                              try {
                                await completeAssignment.mutateAsync(a.id);
                                showToast(`${a.projectName} marked done — no longer counts toward capacity`);
                              } catch (err) {
                                showToast(err instanceof ApiError ? err.message : "Could not mark as done");
                              }
                            }}
                            disabled={a.start >= today || completeAssignment.isPending}
                            title={a.start >= today ? "Starts today — remove it instead" : "Finished — end this assignment yesterday so it stops counting"}
                            style={{ height: 26, padding: "0 10px", border: `1px solid ${color.controlBorder}`, borderRadius: 7, fontSize: 10, fontWeight: 600, textTransform: "uppercase", background: color.surface, color: color.successText, cursor: a.start >= today ? "not-allowed" : "pointer", opacity: a.start >= today ? 0.5 : 1 }}
                          >
                            Done
                          </button>
                        )}
                        <button onClick={() => setMovingId(movingId === a.id ? null : a.id)} style={{ height: 26, padding: "0 10px", border: `1px solid ${color.controlBorder}`, borderRadius: 7, fontSize: 10, fontWeight: 600, textTransform: "uppercase", background: color.surface, cursor: "pointer" }}>
                          Move
                        </button>
                        {movingId === a.id && <MovePopover assignment={a} people={people} projectsById={projectsById} assignments={assignments} today={today} anchorRef={moveAnchorRef} onClose={() => setMovingId(null)} />}
                      </div>
                    ) : (
                      <span />
                    )}
                    {isOwner && (
                      <button
                        onClick={() => {
                          deleteAssignment.mutate(a.id);
                          showToast(`Unassigned from ${a.projectName}`);
                        }}
                        title="Unassign"
                        style={{ width: 24, height: 24, border: "none", background: "none", cursor: "pointer", color: color.textMeta, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <CloseIcon width={13} height={13} />
                      </button>
                    )}
                    {!!a.deadlineExtensions?.length && <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12, color: color.textSecondary }}>
                      <span>{a.deadlineExtensions.at(-1)!.changeType === "DeadlineMissed" ? "Missed" : "Previous"}: <strong style={{ color: deadlineStyle(a.deadlineExtensions.at(-1)).text }}>{a.deadlineExtensions.at(-1)!.previousDeadline}</strong></span>
                      <span>{a.deadlineExtensions.at(-1)!.changeType === "TentativeDeadline" ? "Tentative date" : "Revised date"}: <strong>{a.deadlineExtensions.at(-1)!.newDeadline}</strong></span>
                      <button onClick={() => setDeadlineId(a.id)} style={{ background: "none", border: 0, padding: 0, color: color.infoText, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>View reason{a.deadlineExtensions.length > 1 ? ` / ${a.deadlineExtensions.length} changes` : ""}</button>
                    </div>}
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {isOwner && <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />}
      <DeadlineHistory assignment={assignments.find((a) => a.id === deadlineId) ?? null} onClose={() => setDeadlineId(null)} />
    </Shell>
  );
}

const stepperButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: `1px solid ${color.controlBorder}`,
  borderRadius: 6,
  background: color.surface,
  color: color.textMuted,
  fontSize: 14,
  cursor: "pointer",
};
