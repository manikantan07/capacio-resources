import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import { useAuth } from "../auth/AuthContext";
import { usePeople, useLiveProjects, useCompletedProjects } from "../features/queries";
import { BriefingIcon, AllocationIcon, ProjectsIcon, CompletedIcon, TeamIcon, HistoryIcon, CalendarIcon, ChevronDown } from "./Icons";
import { AvatarCircle } from "./AvatarCircle";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { ExportAllocationButton } from "./ExportAllocationButton";
import { color, fontMono, radius } from "../theme";

const NAV_ITEMS = [
  { to: "/briefing", label: "Briefing", icon: BriefingIcon },
  { to: "/allocation", label: "Allocation", icon: AllocationIcon },
  { to: "/projects", label: "Projects", icon: ProjectsIcon },
  { to: "/completed", label: "Completed", icon: CompletedIcon },
  { to: "/team", label: "Team", icon: TeamIcon },
  { to: "/activity", label: "Activity", icon: HistoryIcon },
];

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

interface ShellProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

export function Shell({ title, subtitle, actionLabel, onAction, children, className }: ShellProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const { data: people } = usePeople();
  const { data: liveProjects } = useLiveProjects();
  const { data: completedProjects } = useCompletedProjects();

  const overCapacityCount = people?.filter((p) => p.band === "OverAllocated").length ?? 0;

  const counts: Record<string, number | undefined> = {
    "/allocation": people?.length,
    "/projects": liveProjects?.length,
    "/completed": completedProjects?.length,
    "/team": people?.length,
  };

  return (
    <div className={className} style={{ display: "flex", height: "100vh", overflow: "hidden", background: color.page }}>
      <aside
        style={{
          width: 230,
          flex: "0 0 230px",
          background: color.surface,
          borderRight: `1px solid ${color.divider}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: color.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: color.textPrimary }}>Capcio</span>
        </div>

        <nav style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                style={{
                  position: "relative",
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  textDecoration: "none",
                  background: active ? color.primarySoft : "transparent",
                  color: active ? color.primaryText : color.textMuted,
                }}
              >
                <span style={{ position: "relative", display: "flex" }}>
                  <Icon style={{ color: active ? color.primary : color.textTertiary }} />
                  {item.to === "/allocation" && overCapacityCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -6,
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        background: color.primary,
                        color: "#fff",
                        fontFamily: fontMono,
                        fontSize: 8.5,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                      }}
                    >
                      {overCapacityCount}
                    </span>
                  )}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {counts[item.to] !== undefined && (
                  <span style={{ fontFamily: fontMono, fontSize: 10.5, fontWeight: 600, color: color.textCount }}>
                    {counts[item.to]}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ position: "relative", borderTop: `1px solid ${color.divider}`, padding: 14 }}>
          <button
            aria-label="Account menu"
            onClick={() => setAccountOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            <AvatarCircle initials={(user?.name ?? "?").slice(0, 2).toUpperCase()} color={color.primary} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: color.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.name ?? "Signed in"}
                </span>
                {user && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: "1px 5px",
                      borderRadius: radius.badge,
                      background: user.role === "Owner" ? color.primarySoft : color.neutralSoft,
                      color: user.role === "Owner" ? color.primaryText : color.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {user.role === "Owner" ? "Editor" : "Viewer"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: color.textMeta, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
            <ChevronDown style={{ color: color.textTertiary }} />
          </button>
          {accountOpen && (
            <div
              style={{
                position: "absolute",
                bottom: 60,
                left: 14,
                right: 14,
                background: color.surface,
                border: `1px solid ${color.border}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                zIndex: 10,
              }}
            >
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  setAccountOpen(false);
                  setChangePasswordOpen(true);
                }}
              >
                Change password
              </Button>
              <Button fullWidth size="small" color="error" onClick={signOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </aside>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <header
          style={{
            height: 56,
            flex: "0 0 56px",
            background: color.surface,
            borderBottom: `1px solid ${color.divider}`,
            padding: "0 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.016em", color: color.textPrimary }}>{title}</div>
            <div style={{ fontSize: 11.5, color: color.textTertiary }}>{subtitle}</div>
          </div>

          <div
            style={{
              height: 32,
              padding: "0 11px",
              border: `1px solid ${color.controlBorder}`,
              background: color.surface,
              borderRadius: 8,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: color.textSecondary,
            }}
          >
            <CalendarIcon style={{ color: color.textTertiary }} />
            <span>
              As of <span style={{ fontFamily: fontMono }}>{todayLabel()}</span>
            </span>
          </div>
          {["/allocation", "/projects", "/team"].includes(location.pathname) && <ExportAllocationButton />}
          {actionLabel && (
            <Button variant="contained" onClick={onAction} sx={{ height: 32, px: 1.6, fontSize: 12.5 }}>
              {actionLabel}
            </Button>
          )}
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: 22 }}>{children}</main>
      </div>
    </div>
  );
}
