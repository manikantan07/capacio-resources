import { useMemo, useState } from "react";
import { Shell } from "../components/Shell";
import { useActivityHistory, useUndoActivities } from "../features/queries";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthContext";
import { ChevronRight, UndoIcon } from "../components/Icons";
import { color, fontMono, radius } from "../theme";
import type { ActivityEntry, ActivityLog } from "../types";

function formatTime(iso: string) {
  return new Date(iso + "Z").toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function diffFields(entry: ActivityEntry): { field: string; before: unknown; after: unknown }[] {
  const before = entry.beforeJson ? (JSON.parse(entry.beforeJson) as Record<string, unknown>) : null;
  const after = entry.afterJson ? (JSON.parse(entry.afterJson) as Record<string, unknown>) : null;

  if (!before) return Object.entries(after ?? {}).map(([field, value]) => ({ field, before: undefined, after: value }));
  if (!after) return Object.entries(before).map(([field, value]) => ({ field, before: value, after: undefined }));

  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields]
    .filter((field) => field !== "Id" && JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

function renderValue(v: unknown) {
  if (v === undefined) return "—";
  if (v === null) return "empty";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "empty";
  return String(v);
}

function EntryDiff({ entry }: { entry: ActivityEntry }) {
  const kind = entry.beforeJson === null ? "created" : entry.afterJson === null ? "deleted" : "updated";
  const diffs = diffFields(entry);

  return (
    <div style={{ padding: "8px 10px", background: color.surfaceSubtle, borderRadius: 8, fontSize: 11.5 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {entry.entityType}: {entry.label} <span style={{ color: color.textMeta, fontWeight: 400 }}>({kind})</span>
      </div>
      {diffs.map((d) => (
        <div key={d.field} style={{ display: "flex", gap: 8, padding: "2px 0", color: color.textSecondary }}>
          <span style={{ width: 90, flexShrink: 0, color: color.textMeta }}>{d.field}</span>
          {kind === "updated" ? (
            <span style={{ fontFamily: fontMono }}>
              {renderValue(d.before)} → <strong>{renderValue(d.after)}</strong>
            </span>
          ) : (
            <span style={{ fontFamily: fontMono }}>{renderValue(kind === "created" ? d.after : d.before)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ActivityPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data } = useActivityHistory(from || null, to || null);
  const undoActivities = useUndoActivities();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const items = data?.items ?? [];

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelected = (id: string, index: number, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClickedIndex !== null) {
        const [start, end] = [Math.min(lastClickedIndex, index), Math.max(lastClickedIndex, index)];
        for (let i = start; i <= end; i++) {
          if (!items[i].undone) next.add(items[i].id);
        }
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
      }
      return next;
    });
    setLastClickedIndex(index);
  };

  const selectedCount = selected.size;

  const handleUndoSelected = async () => {
    const result = await undoActivities.mutateAsync([...selected]);
    const succeeded = result.outcomes.filter((o) => o.success).length;
    const failed = result.outcomes.filter((o) => !o.success);
    showToast(
      failed.length === 0
        ? `Undid ${succeeded} ${succeeded === 1 ? "activity" : "activities"}`
        : `Undid ${succeeded} of ${result.outcomes.length} — ${failed.length} skipped (${failed[0].message})`,
    );
    setSelected(new Set());
  };

  const handleUndoOne = async (id: string) => {
    const result = await undoActivities.mutateAsync([id]);
    showToast(result.outcomes[0].success ? "Undone" : result.outcomes[0].message);
  };

  const actionColor = useMemo(
    () => (a: ActivityLog) => (a.actionType === "Undo" ? color.textTertiary : a.undone ? color.textFaint : color.textPrimary),
    [],
  );

  return (
    <Shell title="Activity" subtitle={isOwner ? "Every change, who made it, and when — undo any of them individually" : "Every change, who made it, and when"}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInputStyle} />
        <span style={{ color: color.textMeta, fontSize: 12 }}>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInputStyle} />
        {(from || to) && (
          <button
            onClick={() => { setFrom(""); setTo(""); }}
            style={{ fontSize: 11.5, color: color.textMeta, background: "none", border: "none", cursor: "pointer" }}
          >
            Clear
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: color.textMeta }}>{data?.totalCount ?? 0} activities</span>
      </div>

      {items.length === 0 && (
        <div style={{ border: `1px dashed ${color.controlBorder}`, borderRadius: radius.card, padding: 32, textAlign: "center", color: color.textMeta }}>
          No activity yet. Every create, edit, move, and delete across the app will show up here.
        </div>
      )}

      <div style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, marginBottom: selectedCount > 0 ? 60 : 0 }}>
        {items.map((a, index) => {
          const isExpanded = expanded.has(a.id);
          const isSelected = selected.has(a.id);
          return (
            <div key={a.id} style={{ borderBottom: `1px solid ${color.hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                {isOwner && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={a.undone}
                    onChange={(e) => toggleSelected(a.id, index, (e.nativeEvent as MouseEvent).shiftKey)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: a.undone ? "not-allowed" : "pointer" }}
                  />
                )}
                <button
                  onClick={() => toggleExpanded(a.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                >
                  <ChevronRight style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform .15s", color: color.textTertiary }} />
                </button>
                <span style={{ fontFamily: fontMono, fontSize: 11, color: color.textMeta, width: 140, flexShrink: 0 }}>{formatTime(a.occurredAt)}</span>
                <span style={{ fontSize: 12.5, color: actionColor(a), flex: 1, textDecoration: a.undone ? "line-through" : "none" }}>{a.summary}</span>
                <span style={{ fontSize: 11, color: color.textMeta }}>{a.actorEmail}</span>
                {a.undone && (
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: radius.pill, background: color.neutralSoft, color: color.textMuted }}>
                    Undone
                  </span>
                )}
                {isOwner && a.actionType !== "Undo" && !a.undone && (
                  <button
                    onClick={() => handleUndoOne(a.id)}
                    title="Undo this activity"
                    style={{ display: "flex", alignItems: "center", gap: 4, height: 24, padding: "0 8px", border: `1px solid ${color.controlBorder}`, borderRadius: 6, background: "none", fontSize: 11, cursor: "pointer", color: color.textSecondary }}
                  >
                    <UndoIcon /> Undo
                  </button>
                )}
              </div>
              {isExpanded && (
                <div style={{ padding: "0 14px 12px 46px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {a.entries.map((entry, i) => (
                    <EntryDiff key={i} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOwner && selectedCount > 0 && (
        <div
          style={{
            position: "fixed", left: 254, right: 22, bottom: 22,
            background: color.textPrimary, color: "#fff", borderRadius: radius.card,
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100,
          }}
        >
          <span style={{ fontSize: 12.5 }}>{selectedCount} selected</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSelected(new Set())} style={{ background: "none", border: "none", color: "#fff", opacity: 0.8, cursor: "pointer", fontSize: 12 }}>
            Clear
          </button>
          <button
            onClick={handleUndoSelected}
            disabled={undoActivities.isPending}
            style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "none", background: "#fff", color: color.textPrimary, fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}
          >
            Undo selected ({selectedCount})
          </button>
        </div>
      )}
    </Shell>
  );
}

const dateInputStyle: React.CSSProperties = {
  height: 32, padding: "0 10px", border: `1px solid ${color.controlBorder}`, borderRadius: 7, fontSize: 12,
};
