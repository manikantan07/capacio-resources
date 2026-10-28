import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { StatCard } from "../components/StatCard";
import { AvatarCircle } from "../components/AvatarCircle";
import { CheckIcon } from "../components/Icons";
import { NewProjectModal } from "../components/NewProjectModal";
import { StatusDot } from "../components/StatusBadge";
import { usePeople, useLiveProjects, useMarkComplete, useConfirmProject } from "../features/queries";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthContext";
import { bandColors, color, fontMono } from "../theme";
import type { Project } from "../types";
import { projectDescription } from "../lib/projectDescription";
import { todayIso } from "../lib/allocationRules";

function cellFor(project: Project, personId: string) {
  const cells = project.cells.filter((c) => c.personId === personId);
  if (cells.length === 0) return null;
  const active = cells.filter((c) => c.active);
  if (active.length > 0) {
    return { alloc: active.reduce((sum, c) => sum + c.alloc, 0), active: true, cells: active };
  }
  const latest = cells.reduce((a, b) => (a.end > b.end ? a : b));
  return { alloc: latest.alloc, active: false, cells: [latest] };
}

export function ProjectsPage() {
  const { data: people } = usePeople();
  const { data: projects } = useLiveProjects();
  const markComplete = useMarkComplete();
  const confirmProject = useConfirmProject();
  const { showToast } = useToast();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";
  const today = todayIso();

  const unstaffedCount = projects?.filter((p) => p.headCount === 0).length ?? 0;
  const overAllocatedPeople = people?.filter((p) => p.band === "OverAllocated").length ?? 0;

  const handleConfirm = async (project: Project) => {
    await confirmProject.mutateAsync(project.id);
    showToast(`${project.name} confirmed — its work now counts toward capacity`);
  };

  const handleComplete = async (project: Project) => {
    const result = await markComplete.mutateAsync(project.id);
    showToast(result.message);
  };

  return (
    <Shell
      title="Projects"
      subtitle="Every live project against the whole team"
      actionLabel={isOwner ? "New project" : undefined}
      onAction={() => setNewProjectOpen(true)}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(152px,1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard dotColor={color.primary} label="Live projects" value={projects?.length ?? 0} />
        <StatCard dotColor={color.danger} label="Unstaffed" value={unstaffedCount} sub={unstaffedCount > 0 ? "needs attention" : undefined} subColor={color.dangerText} />
        <StatCard dotColor={color.success} label="People staffed" value={people?.filter((p) => p.load > 0).length ?? 0} />
        <StatCard dotColor={color.warning} label="Over-allocated" value={overAllocatedPeople} sub={overAllocatedPeople > 0 ? "review load" : undefined} subColor={color.warningText} />
      </div>

      {people && projects && (
        <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, overflowX: "auto" }}>
          <div style={{ minWidth: 250 + people.length * 90 + 132 }}>
            <div style={{ display: "grid", gridTemplateColumns: `250px repeat(${people.length}, minmax(80px,1fr)) 132px`, background: color.surfaceSubtle, borderBottom: `1px solid ${color.border}` }}>
              <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", color: color.textTertiary, textTransform: "uppercase" }}>Project</div>
              {people.map((p) => (
                <div key={p.id} style={{ padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ position: "relative" }}>
                    <AvatarCircle initials={p.initials} color={p.color} size={22} />
                    <StatusDot status={p.status} />
                  </div>
                  <span style={{ fontSize: 10.5, color: color.textTertiary }}>{p.name.split(" ")[0]}</span>
                </div>
              ))}
              <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", color: color.textTertiary, textTransform: "uppercase", textAlign: "right" }}>Total</div>
            </div>

            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `250px repeat(${people.length}, minmax(80px,1fr)) 132px`,
                  borderBottom: `1px solid ${color.hairline}`,
                  background: project.headCount === 0 ? "#FFFCFB" : "transparent",
                }}
              >
                <div style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: project.color, marginTop: 3, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {project.name}
                      {project.state === "Tentative" && (
                        <span
                          title="Not confirmed yet — its work is shown but doesn't count toward people's capacity"
                          style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 4, border: `1px dashed ${color.textMeta}`, color: color.textMuted }}
                        >
                          Tentative
                        </span>
                      )}
                    </div>
                    <div title={projectDescription(project, today)} style={{ fontSize: 11, color: color.textMeta, overflowWrap: "anywhere", lineHeight: 1.4 }}>
                      {project.owner && project.owner !== "—" ? `${project.owner} · ` : ""}{projectDescription(project, today)}
                    </div>
                  </div>
                </div>

                {people.map((p) => {
                  const cell = cellFor(project, p.id);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {!cell ? (
                        <span style={{ color: color.textDisabled2 }}>—</span>
                      ) : (
                        <button
                          onClick={() => navigate(`/allocation?person=${p.id}&assignment=${cell.cells[0].assignmentId}`)}
                          title={`${project.state === "Tentative" ? "Tentative — doesn't count toward capacity until confirmed — " : cell.active ? "" : "Not active — doesn't count toward capacity — "}${cell.cells[0].work} — ${cell.cells[0].start} to ${cell.cells[0].end} — open in Allocation`}
                          style={{
                            fontFamily: fontMono,
                            fontSize: 11.5,
                            fontWeight: cell.active ? 600 : 400,
                            width: 44,
                            textAlign: "center",
                            padding: "3px 0",
                            borderRadius: 999,
                            border: "none",
                            cursor: "pointer",
                            background: cell.active ? color.infoSoft : color.hairline2,
                            color: cell.active ? color.infoText : color.textMeta,
                          }}
                        >
                          {cell.alloc}%
                        </button>
                      )}
                    </div>
                  );
                })}

                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: fontMono, fontSize: 12.5, fontWeight: 600, color: bandColors[project.band].base }}>
                      {project.totalStaffedPercent}%
                    </div>
                    <div style={{ fontSize: 10.5, color: color.textMeta }}>{project.headCount ? `${project.headCount} people` : "unstaffed"}</div>
                  </div>
                  {isOwner && project.state === "Tentative" && (
                    <button
                      title="Confirm project — its work starts counting toward capacity"
                      onClick={() => handleConfirm(project)}
                      disabled={confirmProject.isPending}
                      style={{ height: 26, padding: "0 8px", border: `1px solid ${color.controlBorder}`, borderRadius: 7, background: color.surface, color: color.infoText, fontSize: 10, fontWeight: 600, textTransform: "uppercase", cursor: "pointer" }}
                    >
                      Confirm
                    </button>
                  )}
                  {isOwner && (
                    <button
                      title="Mark complete"
                      onClick={() => handleComplete(project)}
                      style={{
                        width: 26,
                        height: 26,
                        border: `1px solid ${color.controlBorder}`,
                        borderRadius: 7,
                        background: color.surface,
                        color: color.textTertiary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = color.success;
                        e.currentTarget.style.color = color.successText;
                        e.currentTarget.style.background = color.successSoft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = color.controlBorder;
                        e.currentTarget.style.color = color.textTertiary;
                        e.currentTarget.style.background = color.surface;
                      }}
                    >
                      <CheckIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: `250px repeat(${people.length}, minmax(80px,1fr)) 132px`, padding: "8px 0" }}>
              <div />
              {people.map((p) => (
                <div key={p.id} style={{ textAlign: "center", fontFamily: fontMono, fontSize: 12, fontWeight: 600, color: bandColors[p.band].base }}>
                  {p.load}%
                </div>
              ))}
              <div />
            </div>
          </div>
        </div>
      )}
      {isOwner && <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />}
    </Shell>
  );
}
