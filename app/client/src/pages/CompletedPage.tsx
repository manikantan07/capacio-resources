import { useState } from "react";
import { Shell } from "../components/Shell";
import { StatCard } from "../components/StatCard";
import { AvatarCircle } from "../components/AvatarCircle";
import { CheckIcon, ChevronRight, ChevronDown } from "../components/Icons";
import { useCompletedProjects, useCompletedStats, useReopenProject } from "../features/queries";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthContext";
import { color, fontMono, radius } from "../theme";

export function CompletedPage() {
  const { data: stats } = useCompletedStats();
  const { data: projects } = useCompletedProjects();
  const reopen = useReopenProject();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleReopen = async (id: string, name: string) => {
    await reopen.mutateAsync(id);
    showToast(`${name} reopened — re-staff it from Allocation`);
  };

  return (
    <Shell title="Completed" subtitle="What shipped, who worked on it, what it cost">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(152px,1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard dotColor={color.success} label="Completed" value={stats?.completedCount ?? 0} />
        <StatCard dotColor={color.primary} label="Effort spent" value={stats?.totalEffortPersonDays.toFixed(1) ?? "0.0"} unit="person-days" />
        <StatCard dotColor={color.neutral} label="People involved" value={stats?.peopleInvolved ?? 0} />
        <StatCard
          dotColor={color.warning}
          label="Still live"
          value={stats?.stillLiveCount ?? 0}
          sub={stats && stats.unstaffedLiveCount > 0 ? `${stats.unstaffedLiveCount} unstaffed` : undefined}
          subColor={color.dangerText}
        />
      </div>

      {projects?.length === 0 && (
        <div style={{ border: `1px dashed ${color.controlBorder}`, borderRadius: radius.card, padding: 32, textAlign: "center", color: color.textMeta }}>
          No completed projects yet
          <div style={{ fontSize: 12, marginTop: 4 }}>Mark a project complete from the Projects view and it lands here with its full staffing record.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {projects?.map((project) => (
          <div key={project.id} style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.card, overflow: "hidden" }}>
            <div
              onClick={() => toggleExpanded(project.id)}
              style={{ padding: "14px 18px", borderBottom: `1px solid ${color.divider}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <span style={{ color: color.textFaint, display: "flex", flexShrink: 0 }}>
                {expanded.has(project.id) ? <ChevronDown width={14} height={14} /> : <ChevronRight width={14} height={14} />}
              </span>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: project.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{project.name}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: radius.pill,
                      background: color.successSoft,
                      color: color.successText,
                    }}
                  >
                    <CheckIcon width={10} height={10} /> Completed{" "}
                    {new Date(project.completedOn).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: color.textTertiary, marginTop: 2 }}>
                  {project.owner} · {project.tech.join(", ")}
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReopen(project.id, project.name);
                  }}
                  style={{ height: 28, padding: "0 12px", border: `1px solid ${color.controlBorder}`, background: "none", borderRadius: 7, fontSize: 12, cursor: "pointer" }}
                >
                  Reopen
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", background: color.surfaceSubtle }}>
              {[
                { label: "Resources", value: project.resourceCount },
                { label: "Effort", value: project.totalEffortPersonDays.toFixed(1), unit: "d" },
                { label: "Ran for", value: project.ranForDays, unit: "d" },
                { label: "Assignments", value: project.assignmentCount },
              ].map((fact, i) => (
                <div key={fact.label} style={{ padding: "10px 18px", borderLeft: i > 0 ? `1px solid ${color.hairline}` : undefined }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", color: color.textTertiary, textTransform: "uppercase" }}>{fact.label}</div>
                  <div style={{ fontFamily: fontMono, fontSize: 17, fontWeight: 600, color: color.textPrimary }}>
                    {fact.value}
                    {fact.unit && <span style={{ fontSize: 12, color: color.textMeta }}> {fact.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {expanded.has(project.id) && (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 704 }}>
                {project.contributors.length === 0 && (
                  <div style={{ padding: 18, fontSize: 12.5, color: color.textMeta }}>No one was ever staffed on this project.</div>
                )}
                {project.contributors.map((c) => (
                  <div
                    key={c.personId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "186px minmax(150px,1fr) 152px 66px 74px",
                      gap: 10,
                      padding: "11px 18px",
                      borderTop: `1px solid ${color.hairline2}`,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AvatarCircle initials={c.formerMember ? "—" : c.personName.slice(0, 2).toUpperCase()} color={c.personColor ?? color.neutral} size={30} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.personName}</div>
                        <div style={{ fontSize: 11, color: color.textMeta }}>{c.personRole}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.workSummary}</div>
                      {c.stintCount > 1 && <div style={{ fontSize: 11, color: color.textMeta }}>{c.stintCount} stints</div>}
                    </div>
                    <div>
                      <div style={{ fontFamily: fontMono, fontSize: 11.5 }}>
                        {c.periodStart} → {c.periodEnd}
                      </div>
                      <div style={{ fontSize: 11, color: color.textMeta }}>{c.daysOnProject}d on the project</div>
                    </div>
                    <div style={{ fontFamily: fontMono, textAlign: "right" }}>{c.peakAlloc}%</div>
                    <div style={{ fontFamily: fontMono, textAlign: "right" }}>
                      {c.effortPersonDays.toFixed(1)} <span style={{ fontSize: 11, color: color.textMeta }}>d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}
