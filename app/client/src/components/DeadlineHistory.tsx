import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import EventRepeat from "@mui/icons-material/EventRepeat";
import PauseCircleOutline from "@mui/icons-material/PauseCircleRounded";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import HelpOutline from "@mui/icons-material/HelpRounded";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Close from "@mui/icons-material/Close";
import { color } from "../theme";
import type { Assignment, DeadlineExtension } from "../types";
import { deadlineStyle } from "../lib/deadlineChanges";

export function DeadlineBadge({ extension, onClick }: { extension?: DeadlineExtension; onClick?: () => void }) {
  const status = deadlineStyle(extension);
  const type = extension?.changeType ?? "DeadlineMissed";
  const Icon = type === "DeadlineMissed" ? WarningAmberRounded : type === "OnHold" ? PauseCircleOutline
    : type === "Backlog" ? Inventory2Outlined : type === "TentativeDeadline" ? HelpOutline : EventRepeat;
  const content = <><Icon sx={{ fontSize: 14, flexShrink: 0 }} /> {status.label}</>;
  const style = { display: "inline-flex", maxWidth: "100%", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: status.text, background: status.background, padding: "3px 6px", borderRadius: 4, border: 0 };
  return onClick
    ? <button onClick={onClick} style={{ ...style, cursor: "pointer" }} title="View reason and date history">{content}</button>
    : <span style={style}>{content}</span>;
}

export function DeadlineHistory({ assignment, onClose }: { assignment: Assignment | null; onClose: () => void }) {
  return <Dialog open={!!assignment} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="deadline-history-title">
    <DialogTitle id="deadline-history-title" sx={{ fontSize: 16, pr: 6 }}>
      {assignment?.projectName} · Deadline history
      <IconButton aria-label="Close deadline history" onClick={onClose} sx={{ position: "absolute", top: 8, right: 8 }}><Close /></IconButton>
    </DialogTitle>
    <DialogContent>
      <div style={{ fontSize: 13, marginBottom: 18, color: color.textSecondary }}>{assignment?.personName} · {assignment?.work}</div>
      <div style={{ fontSize: 13, marginBottom: 18 }}>Current end date: <strong>{assignment?.end}</strong></div>
      {(assignment?.deadlineExtensions ?? []).map((extension, i) => <section key={i} style={{ borderTop: `1px solid ${color.divider}`, padding: "14px 0" }}>
        <DeadlineBadge extension={extension} />
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
          <dt>{extension.changeType === "DeadlineMissed" ? "Missed deadline" : "Previous deadline"}</dt><dd style={{ margin: 0, color: deadlineStyle(extension).text }}>{extension.previousDeadline}</dd>
          <dt>{extension.changeType === "TentativeDeadline" ? "Tentative date" : "Revised deadline"}</dt><dd style={{ margin: 0, fontWeight: 600 }}>{extension.newDeadline}</dd>
        </dl>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Reason</div>
        <div style={{ fontSize: 13, marginBottom: 12, color: color.textSecondary, overflowWrap: "anywhere" }}>{extension.reasonCategory || "Not recorded"}</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Additional description</div>
        <div style={{ fontSize: 13, color: color.textSecondary, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{extension.reason || "Not recorded"}</div>
      </section>)}
    </DialogContent>
  </Dialog>;
}
