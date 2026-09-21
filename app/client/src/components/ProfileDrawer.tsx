import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { useUpdatePerson } from "../features/queries";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { LoadBadge, LoadValue } from "./LoadBadge";
import { CloseIcon } from "./Icons";
import { color, fontMono } from "../theme";
import type { Person } from "../types";

interface ProfileDrawerProps {
  person: Person | null;
  onClose: () => void;
}

export function ProfileDrawer({ person, onClose }: ProfileDrawerProps) {
  const updatePerson = useUpdatePerson();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<Person | null>(person);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => setDraft(person), [person]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!person || !draft) return null;

  const set = <K extends keyof Person>(key: K, value: Person[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (draft.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }
    set("skills", [...draft.skills, trimmed]);
    setSkillInput("");
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    try {
      await updatePerson.mutateAsync({
        id: draft.id,
        name: draft.name,
        role: draft.role,
        type: draft.type,
        email: draft.email,
        phone: draft.phone,
        location: draft.location,
        status: draft.status,
        hours: draft.hours,
        joined: draft.joined,
        skills: draft.skills,
        notes: draft.notes,
      });
      showToast(`${draft.name}'s profile updated`);
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save profile");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,17,20,0.4)" }} />
      <div style={{ position: "relative", width: 420, maxWidth: "92vw", background: color.surface, height: "100%", overflowY: "auto", boxShadow: "-16px 0 40px rgba(0,0,0,0.16)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${color.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>Edit profile</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: color.textTertiary }}>
            <CloseIcon />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <TextField label="Name" value={draft.name} onChange={(e) => set("name", e.target.value)} required />
          <TextField label="Title" value={draft.role} onChange={(e) => set("role", e.target.value)} />
          <TextField select label="Engagement type" value={draft.type} onChange={(e) => set("type", e.target.value as Person["type"])}>
            <MenuItem value="FullTime">Full-time</MenuItem>
            <MenuItem value="PartTime">Part-time</MenuItem>
            <MenuItem value="Contract">Contract</MenuItem>
            <MenuItem value="Intern">Intern</MenuItem>
          </TextField>
          <TextField label="Email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
          <TextField label="Phone" value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />

          <div>
            <div style={{ fontSize: 12, color: color.textLabel, marginBottom: 6 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {draft.skills.map((s) => (
                <span
                  key={s}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, padding: "4px 8px", background: color.neutralSoft, borderRadius: 999 }}
                >
                  {s}
                  <button
                    onClick={() => set("skills", draft.skills.filter((x) => x !== s))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: color.textTertiary, padding: 0, display: "flex" }}
                  >
                    <CloseIcon width={11} height={11} />
                  </button>
                </span>
              ))}
            </div>
            <TextField
              size="small"
              placeholder="Type a skill, press Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              fullWidth
            />
          </div>

          <TextField
            select
            label="Status"
            value={draft.status}
            onChange={(e) => set("status", e.target.value as Person["status"])}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="OnLeave">On leave</MenuItem>
            <MenuItem value="SickLeave">Sick leave</MenuItem>
            <MenuItem value="NoticePeriod">Notice period</MenuItem>
          </TextField>
          <TextField label="Weekly hours" value={draft.hours} onChange={(e) => set("hours", e.target.value)} />
          <TextField label="Joined" type="date" value={draft.joined ?? ""} onChange={(e) => set("joined", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Location" value={draft.location ?? ""} onChange={(e) => set("location", e.target.value)} />
          <TextField label="Notes" value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} multiline minRows={2} />

          <Button variant="contained" onClick={save} disabled={!draft.name.trim() || updatePerson.isPending} sx={{ height: 38 }}>
            Save
          </Button>

          <div style={{ marginTop: 12, paddingTop: 16, borderTop: `1px solid ${color.divider}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: color.textSecondary }}>Current work</span>
              <LoadBadge band={person.band} label={person.bandLabel} />
              <LoadValue load={person.load} band={person.band} />
            </div>
            {person.assignments.length === 0 && <div style={{ fontSize: 12, color: color.textMeta }}>No assignments.</div>}
            {person.assignments.map((a) => (
              <div key={a.id} style={{ padding: "8px 0", borderTop: `1px solid ${color.hairline}`, fontSize: 12 }}>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  {a.projectName}
                  {!a.active && (
                    <span
                      title="Doesn't count toward this person's current capacity"
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: color.hairline, color: color.textMeta }}
                    >
                      Not active
                    </span>
                  )}
                </div>
                <div style={{ color: color.textMeta }}>{a.work}</div>
                <div style={{ fontFamily: fontMono, color: color.textMeta, marginTop: 2 }}>
                  {a.alloc}% · {a.start} → {a.end}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
