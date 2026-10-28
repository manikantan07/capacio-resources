import { useState } from "react";
import Button from "@mui/material/Button";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import TableViewOutlined from "@mui/icons-material/TableViewOutlined";
import { AllocationSheetDialog } from "./AllocationSheetDialog";
import { api, ApiError } from "../api/client";
import { todayIso } from "../lib/allocationRules";
import { useToast } from "./ToastProvider";
import type { Person, Project, Assignment } from "../types";

export function ExportAllocationButton() {
  const [exporting, setExporting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const { showToast } = useToast();
  const exportCurrentStatus = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [people, projects, assignments, { downloadAllocationWorkbook }] = await Promise.all([
        api.get<Person[]>("/api/people"), api.get<Project[]>("/api/projects"), api.get<Assignment[]>("/api/assignments"),
        import("../lib/allocationExport"),
      ]);
      await downloadAllocationWorkbook(people, projects, assignments, todayIso());
      showToast("Team allocation exported");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Could not export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return <>
    <Button variant="outlined" startIcon={<TableViewOutlined />} onClick={() => setViewOpen(true)}
      sx={{ height: 32, px: 1.3, fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0 }}>View sheet</Button>
    <Button variant="outlined" onClick={exportCurrentStatus} disabled={exporting}
    startIcon={<FileDownloadOutlined />} aria-label="Export everyone to Excel"
    title="Export everyone's current allocation to Excel"
    sx={{ height: 32, px: 1.3, fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0 }}>
    {exporting ? "Exporting..." : "Export Excel"}
    </Button>
    {viewOpen && <AllocationSheetDialog onClose={() => setViewOpen(false)} />}
  </>;
}
