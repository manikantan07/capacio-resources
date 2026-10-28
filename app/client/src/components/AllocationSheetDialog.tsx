import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Close from "@mui/icons-material/Close";
import Refresh from "@mui/icons-material/Refresh";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import type ExcelJS from "exceljs";
import { api, ApiError } from "../api/client";
import { todayIso } from "../lib/allocationRules";
import { allocationDateStatus, ALLOCATION_DATE_COLORS } from "../lib/allocationDateColors";
import { useToast } from "./ToastProvider";
import type { Person, Project, Assignment } from "../types";
import "./AllocationSheetDialog.css";

function displayCell(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value instanceof Date) {
    const date = value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    return cell.numFmt.includes("hh:mm") ? `${date} ${value.toISOString().slice(11, 16)}` : date;
  }
  if (typeof value === "number") {
    if (cell.numFmt === "0%") return `${Math.round(value * 100)}%`;
    if (cell.numFmt === '0.0"h"') return `${value.toFixed(1)}h`;
  }
  return cell.text;
}

export function AllocationSheetDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();
  const { data, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["allocation-sheet"],
    refetchOnMount: "always",
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => {
      const [people, projects, assignments, { createAllocationWorkbook }] = await Promise.all([
        api.get<Person[]>("/api/people"), api.get<Project[]>("/api/projects"), api.get<Assignment[]>("/api/assignments"),
        import("../lib/allocationExport"),
      ]);
      const asOf = todayIso();
      return { workbook: createAllocationWorkbook(people, projects, assignments, asOf), asOf };
    },
    // ExcelJS workbooks contain circular references and cannot use JSON structural sharing.
    structuralSharing: false,
  });

  const sheet = data?.workbook.worksheets[tab];
  const headerRow = tab === 0 ? 4 : 1;
  const rows: ExcelJS.Row[] = [];
  sheet?.eachRow((row, index) => {
    if (index > headerRow && Array.from({ length: sheet.columnCount }, (_, i) => displayCell(row.getCell(i + 1)))
      .join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) rows.push(row);
  });
  const columns = Array.from({ length: sheet?.columnCount ?? 0 }, (_, i) => i + 1);

  const download = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const { downloadWorkbook } = await import("../lib/allocationExport");
      await downloadWorkbook(data.workbook, data.asOf);
      showToast("Team allocation exported");
    } catch {
      showToast("Could not export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return <Dialog open fullScreen onClose={onClose} aria-labelledby="sheet-preview-title">
    <div className="sheet-preview">
      <div className="sheet-preview-toolbar">
        <div className="sheet-preview-heading">
          <h2 id="sheet-preview-title">AppLab Team - Resource Allocation &amp; Skills</h2>
          <div className="sheet-preview-meta">{data ? `As of ${data.asOf} · Updated ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Current team allocation"}</div>
        </div>
        <div className="sheet-preview-actions">
          <Tooltip title="Refresh sheet"><span><IconButton aria-label="Refresh sheet" disabled={isFetching} onClick={() => void refetch()}><Refresh /></IconButton></span></Tooltip>
          <Button variant="outlined" size="small" startIcon={<FileDownloadOutlined />} disabled={!data || isFetching || exporting}
            onClick={download} title="Download full workbook">{exporting ? "Exporting..." : "Export Excel"}</Button>
          <Tooltip title="Close sheet"><IconButton aria-label="Close sheet" onClick={onClose}><Close /></IconButton></Tooltip>
        </div>
      </div>
      <div className="sheet-preview-controls">
        <Tabs value={tab} onChange={(_, value: number) => { setTab(value); setSearch(""); }} variant="scrollable" scrollButtons="auto" aria-label="Workbook sheets">
          <Tab label="Resource Allocation" id="allocation-sheet-tab-0" aria-controls="allocation-sheet-panel" />
          <Tab label="Deadline Changes" id="allocation-sheet-tab-1" aria-controls="allocation-sheet-panel" />
        </Tabs>
        <TextField label="Search sheet" size="small" value={search} onChange={(event) => setSearch(event.target.value)}
          sx={{ width: 250, maxWidth: "100%" }} />
      </div>
      <div className="sheet-preview-progress">{isFetching && <LinearProgress aria-label="Loading sheet" />}</div>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refetch()}>Retry</Button>}>
        {error instanceof ApiError ? error.message : "Could not load the sheet."}{data ? " Showing the last loaded sheet." : ""}
      </Alert>}
      <div className="sheet-preview-table-wrap" role="tabpanel" id="allocation-sheet-panel" aria-labelledby={`allocation-sheet-tab-${tab}`} aria-busy={isFetching}>
        {sheet && <table className="sheet-preview-table" aria-label={sheet.name}>
          <colgroup>{columns.map((col) => <col key={col} style={{ width: Math.max(110, (sheet.getColumn(col).width ?? 18) * 7) }} />)}</colgroup>
          <thead><tr>{columns.map((col) => <th key={col} scope="col">{sheet.getRow(headerRow).getCell(col).text}</th>)}</tr></thead>
          <tbody>{rows.map((row) => {
            const status = tab === 0 ? allocationDateStatus(row.getCell(6).value) : undefined;
            const dateColors = status ? ALLOCATION_DATE_COLORS[status] : undefined;
            return <tr key={row.number}>{columns.map((col) => {
            const cell = row.getCell(col);
            const fill = cell.fill?.type === "pattern" ? cell.fill.fgColor?.argb : undefined;
            return <td key={col} style={{ background: dateColors?.background ?? (fill ? `#${fill.slice(-6)}` : "#fff"), color: dateColors?.color ?? (cell.font?.color?.argb ? `#${cell.font.color.argb.slice(-6)}` : "#161616"),
              fontWeight: cell.font?.bold ? 600 : 400, textAlign: cell.alignment?.horizontal === "center" ? "center" : "left" }}>{displayCell(cell)}</td>;
          })}</tr>;
          })}</tbody>
        </table>}
        {!data && isFetching && <div className="sheet-preview-empty" role="status">Loading sheet...</div>}
        {sheet && rows.length === 0 && <div className="sheet-preview-empty" role="status">{search ? "No matching rows" : tab === 1 ? "No deadline changes recorded" : "No team members"}</div>}
      </div>
      <div className="sheet-preview-footer">
        <span>{rows.length} {rows.length === 1 ? "row" : "rows"}</span>
        {tab === 0 && <><span>8-hour day</span><span>Totals repeat per person</span>
          <span><i className="sheet-preview-swatch" style={{ background: ALLOCATION_DATE_COLORS.overdue.background }} />End date passed</span>
          <span><i className="sheet-preview-swatch" style={{ background: ALLOCATION_DATE_COLORS.endingSoon.background }} />Ending within 30 days</span></>}
      </div>
    </div>
  </Dialog>;
}
