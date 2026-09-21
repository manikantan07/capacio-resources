import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { CloseIcon, UndoIcon } from "../components/Icons";
import {
  usePeople,
  useLiveProjects,
  useActivityHistory,
  useUndoActivities,
  useAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useUpdateAlloc,
  useDeleteAssignment,
  useReassignAssignment,
} from "../features/queries";
import { useAuth } from "../auth/AuthContext";
import { generateCalls, generateHeadline } from "../lib/callGenerator";
import { calculateLoad, getLoadBand, BAND_WORD, todayIso, isActive } from "../lib/allocationRules";
import { color, fontMono, bandColors, radius } from "../theme";

export function BriefingPage() {
  const { data: people } = usePeople();
  const { data: projects } = useLiveProjects();
  const { data: liveAssignments } = useAssignments();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const today = todayIso();

  const assignments = liveAssignments ?? [];

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const updateAlloc = useUpdateAlloc();
  const deleteAssignment = useDeleteAssignment();
  const reassignAssignment = useReassignAssignment();

  const undoActivities = useUndoActivities();
  const { data: activityToday } = useActivityHistory(today, null, 1, 50);
  const settledToday = (activityToday?.items ?? []).filter((a) => a.actionType !== "Undo" && !a.undone);

  const projectsById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  const calls = useMemo(() => {
    if (!people || !projects) return [];
    return generateCalls(people, projects, assignments, today, {
      updateAlloc: (id, alloc) => updateAlloc.mutate({ id, alloc }),
      deleteAssignment: (id) => deleteAssignment.mutate(id),
      reassignAssignment: (id, newPersonId) => reassignAssignment.mutate({ id, newPersonId }),
      createAssignment: (input) => createAssignment.mutate({ personId: input.personId, projectId: input.projectId, work: input.work, alloc: input.alloc, start: input.start, end: input.end }),
      updateAssignment: (id, patch) => updateAssignment.mutate({ id, ...patch }),
    }, 5).filter((c) => !dismissed.has(c.id));
  }, [people, projects, assignments, today, dismissed, updateAlloc, deleteAssignment, reassignAssignment, createAssignment, updateAssignment]);

  const { headline, summary } = useMemo(() => {
    if (!people || !projects) return { headline: "", summary: "" };
    return generateHeadline(people, projects, assignments, today);
  }, [people, projects, assignments, today]);

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  const openPersonWeek = (personId: string) => navigate(`/allocation?person=${personId}`);

  return (
    <Shell title="Briefing" subtitle="What needs a decision this week">
      <div style={{ display: "flex", gap: 0, alignItems: "flex-start", width: "100%", justifyContent: "space-between" }}>
        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, alignSelf: "stretch" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: fontMono, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: color.primary }}>
              {new Date(today + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: color.textMeta }}>Morning briefing</span>
          </div>

          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 12, maxWidth: "16ch", color: color.textPrimary }}>
            {headline}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: color.textSecondary, maxWidth: "60ch", marginTop: 14 }}>{summary}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 14px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: color.textMeta, whiteSpace: "nowrap" }}>
              {calls.length === 0 ? "Nothing outstanding" : `${calls.length} call${calls.length === 1 ? "" : "s"} to make`}
            </span>
            <div style={{ flex: 1, height: 1, background: color.divider }} />
          </div>

          {calls.length === 0 && (
            <div style={{ background: color.surface, border: `1px dashed ${color.controlBorder}`, borderRadius: radius.card, padding: "28px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Nothing needs a decision</div>
              <div style={{ fontSize: 12, color: color.textMeta, marginTop: 4 }}>Everyone is inside capacity and every live project has someone on it.</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {calls.map((call) => (
              <div
                key={call.id}
                style={{
                  background: color.surface,
                  border: `1px solid ${color.border}`,
                  borderLeft: `3px solid ${call.toneColor}`,
                  borderRadius: radius.card,
                  padding: "18px 20px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: call.toneColor }}>{call.kindLabel}</span>
                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: color.textFaint }} />
                  <span style={{ fontSize: 10.5, color: color.textMeta, fontFamily: fontMono }}>{call.evidence}</span>
                  <div style={{ flex: 1 }} />
                  {isOwner && (
                    <button onClick={() => dismiss(call.id)} title="Dismiss" style={{ width: 22, height: 22, border: "none", background: "none", cursor: "pointer", color: color.textFaint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CloseIcon width={12} height={12} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em", maxWidth: "44ch" }}>{call.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: color.textSecondary, maxWidth: "62ch", marginTop: 6 }}>{call.body}</div>

                {isOwner && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {call.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={action.run}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 9,
                          textAlign: "left",
                          cursor: "pointer",
                          border: `1px solid ${action.primary ? color.textPrimary : color.controlBorder}`,
                          background: action.primary ? color.textPrimary : color.surface,
                          color: action.primary ? "#fff" : color.textPrimary,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{action.label}</div>
                        <div style={{ fontFamily: fontMono, fontSize: 10, marginTop: 2, color: action.primary ? "rgba(255,255,255,.7)" : color.textMeta }}>{action.detail}</div>
                      </button>
                    ))}
                    {call.personId && (
                      <button
                        onClick={() => openPersonWeek(call.personId!)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 11px",
                          borderRadius: 9,
                          border: `1px dashed ${color.textFaint}`,
                          background: "transparent",
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: color.textTertiary,
                          cursor: "pointer",
                        }}
                      >
                        Open {people?.find((p) => p.id === call.personId)?.name}'s week →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {settledToday.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: color.textMeta }}>Settled today</span>
                <div style={{ flex: 1, height: 1, background: color.divider }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {settledToday.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, background: color.surfaceSubtle, borderRadius: 9, padding: "9px 12px" }}>
                    <span style={{ color: color.success, display: "flex" }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6}>
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                    </span>
                    <span style={{ fontSize: 12, color: color.textSecondary, flex: 1 }}>{a.summary}</span>
                    {isOwner && (
                      <button
                        onClick={() => undoActivities.mutate([a.id])}
                        style={{ display: "flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px", border: `1px solid ${color.controlBorder}`, background: color.surface, borderRadius: 6, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: color.textMuted, cursor: "pointer" }}
                      >
                        <UndoIcon /> Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${color.divider}`, background: color.surfaceSubtle, padding: "0 24px 24px 24px", marginLeft: 26 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: color.textMeta, padding: "20px 0 14px" }}>Team pulse</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {people?.map((p) => {
              const load = calculateLoad(p.id, assignments, projectsById, today);
              const band = getLoadBand(load);
              const bandColor = bandColors[band].base;
              const projectNames = assignments.filter((a) => a.personId === p.id && isActive(a, projectsById.get(a.projectId), today)).map((a) => a.projectName);
              return (
                <button key={p.id} onClick={() => openPersonWeek(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: color.textPrimary }}>{p.name}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontFamily: fontMono, fontSize: 12, fontWeight: 500, color: bandColor }}>{load}%</span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: bandColor }}>{BAND_WORD[band]}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 3, background: color.hairline, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(load, 100)}%`, background: bandColor, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: color.textMeta, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {projectNames.length ? projectNames.join(", ") : "nothing booked"}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 32, borderTop: `1px solid ${color.divider}`, paddingTop: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: color.textMeta, marginBottom: 12 }}>Coming back</div>
            {(() => {
              const upcoming = assignments
                .filter((a) => isActive(a, projectsById.get(a.projectId), today))
                .filter((a) => {
                  const days = Math.round((new Date(a.end + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000);
                  return days >= 0 && days <= 120;
                })
                .sort((a, b) => a.end.localeCompare(b.end))
                .slice(0, 5);

              if (upcoming.length === 0) return <div style={{ fontSize: 11.5, color: color.textMeta }}>Nothing ends this quarter.</div>;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {upcoming.map((a) => (
                    <div key={a.id} style={{ display: "flex", gap: 10, fontSize: 11.5 }}>
                      <span style={{ fontFamily: fontMono, fontSize: 11, fontWeight: 700, color: color.primary, width: 46, flexShrink: 0 }}>
                        {new Date(a.end + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}
                      </span>
                      <span style={{ color: color.textSecondary }}>
                        {a.personName} frees {a.alloc}% as {a.projectName} ends
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </Shell>
  );
}
