import { useRef, useState } from "react";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { Shell } from "../components/Shell";
import { AvatarCircle } from "../components/AvatarCircle";
import { LoadBadge, LoadValue } from "../components/LoadBadge";
import { AddMemberModal } from "../components/AddMemberModal";
import { ProfileDrawer } from "../components/ProfileDrawer";
import { CloseIcon, MailIcon, PhoneIcon, PinIcon, CalendarDotIcon } from "../components/Icons";
import { usePeople, useUpdatePerson, useDeletePerson, useDeleteAssignment } from "../features/queries";
import { useToast } from "../components/ToastProvider";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getFlipMenuProps } from "../lib/menuPlacement";
import { STATUS_LABEL, TYPE_LABEL } from "../lib/labels";
import { color, fontMono, radius, statusColors } from "../theme";
import type { Person, PersonStatus } from "../types";

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: color.textSecondary, minWidth: 0 }}>
      <span style={{ color: color.textTertiary, flexShrink: 0, display: "flex" }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
}

function MemberCard({ person, isOwner }: { person: Person; isOwner: boolean }) {
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const deleteAssignment = useDeleteAssignment();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const statusAnchorRef = useRef<HTMLDivElement>(null);
  const [statusMenuProps, setStatusMenuProps] = useState(() => getFlipMenuProps(null));

  const activeAssignments = person.assignments.filter((a) => a.active);

  const handleStatusChange = (status: PersonStatus) => updatePerson.mutate({ ...person, status });

  const handleRemove = async () => {
    try {
      await deletePerson.mutateAsync(person.id);
      showToast(`${person.name} removed from the team`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not remove member");
    }
  };

  return (
    <>
      <div
        style={{
          background: color.surface,
          border: `1px solid ${color.border}`,
          borderRadius: radius.card,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 16px 14px" }}>
          <AvatarCircle initials={person.initials} color={person.color} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: color.textPrimary, letterSpacing: "-0.01em" }}>{person.name}</div>
            <div style={{ fontSize: 11.5, color: color.textTertiary, marginTop: 1 }}>
              {person.role} · {TYPE_LABEL[person.type]}
            </div>
          </div>
        </div>

        {/* Load */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: color.surfaceSubtle,
            borderTop: `1px solid ${color.hairline}`,
            borderBottom: `1px solid ${color.hairline}`,
          }}
        >
          <LoadBadge band={person.band} label={person.bandLabel} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <LoadValue load={person.load} band={person.band} />
            <span style={{ fontSize: 11, color: color.textMeta }}>· {person.hours}h/wk</span>
          </div>
        </div>

        {/* Contact */}
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <InfoRow icon={<MailIcon />}>{person.email || "—"}</InfoRow>
          <InfoRow icon={<PhoneIcon />}>{person.phone}</InfoRow>
          <InfoRow icon={<PinIcon />}>{person.location}</InfoRow>
          <InfoRow icon={<CalendarDotIcon />}>{person.joined ? `Joined ${person.joined}` : null}</InfoRow>
        </div>

        {/* Skills */}
        {person.skills.length > 0 && (
          <div style={{ padding: "0 16px 14px", display: "flex", flexWrap: "wrap", gap: 5 }}>
            {person.skills.map((s) => (
              <span key={s} style={{ fontSize: 10.5, padding: "3px 7px", background: color.neutralSoft, color: color.textMuted, borderRadius: 999 }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Projects */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${color.hairline}`, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", color: color.textTertiary, textTransform: "uppercase", marginBottom: 8 }}>
            Current projects
          </div>
          {activeAssignments.length === 0 && <div style={{ fontSize: 12, color: color.textMeta }}>No active projects</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeAssignments.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: a.projectColor, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.projectName}</span>
                <span style={{ fontFamily: fontMono, color: color.textMeta }}>{a.alloc}%</span>
                {isOwner && (
                  <button
                    onClick={() => deleteAssignment.mutate(a.id)}
                    title="Unassign"
                    style={{ background: "none", border: "none", cursor: "pointer", color: color.textFaint, padding: 0, display: "flex" }}
                  >
                    <CloseIcon width={11} height={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer: status + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderTop: `1px solid ${color.hairline}` }}>
          {isOwner ? (
            <>
              <div ref={statusAnchorRef} style={{ flex: 1 }}>
                <Select
                  size="small"
                  fullWidth
                  value={person.status}
                  onChange={(e) => handleStatusChange(e.target.value as PersonStatus)}
                  onOpen={() => setStatusMenuProps(getFlipMenuProps(statusAnchorRef.current))}
                  MenuProps={statusMenuProps}
                  sx={{
                    fontSize: 12,
                    height: 30,
                    background: statusColors[person.status].bg,
                    color: statusColors[person.status].text,
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: statusColors[person.status].border },
                  }}
                >
                  {(Object.keys(STATUS_LABEL) as PersonStatus[]).map((s) => (
                    <MenuItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              <button
                title="Open profile"
                onClick={() => setEditing(true)}
                style={{ width: 30, height: 30, border: `1px solid ${color.controlBorder}`, borderRadius: 6, background: "none", cursor: "pointer", fontSize: 12, flexShrink: 0 }}
              >
                ✎
              </button>
              <button
                title="Remove member"
                onClick={handleRemove}
                style={{ width: 30, height: 30, border: `1px solid ${color.controlBorder}`, borderRadius: 6, background: "none", cursor: "pointer", color: color.dangerText, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon width={13} height={13} />
              </button>
            </>
          ) : (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: radius.pill,
                background: statusColors[person.status].bg,
                color: statusColors[person.status].text,
                border: `1px solid ${statusColors[person.status].border}`,
              }}
            >
              {STATUS_LABEL[person.status]}
            </span>
          )}
        </div>
      </div>

      {isOwner && <ProfileDrawer person={editing ? person : null} onClose={() => setEditing(false)} />}
    </>
  );
}

export function TeamPage() {
  const { data: people } = usePeople();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";

  return (
    <Shell title="Team" subtitle="The roster" actionLabel={isOwner ? "Add member" : undefined} onAction={() => setAddMemberOpen(true)}>
      {people && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {people.map((person) => (
            <MemberCard key={person.id} person={person} isOwner={isOwner} />
          ))}
        </div>
      )}
      {isOwner && <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />}
    </Shell>
  );
}
