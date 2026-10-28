import ExcelJS from "exceljs";
import { calculateLoad, getLoadBand } from "./allocationRules";
import { deadlineStyle } from "./deadlineChanges";
import { assignmentDescription } from "./projectDescription";
import { ALLOCATION_DATE_COLORS } from "./allocationDateColors";
import type { Assignment, LoadBand, Person, Project } from "../types";

const HEADERS = ["Resource Name", "Skillset", "Project Name", "Allocation %", "Start Date", "End Date",
  "Total Alloc %", "Hours / Day", "Avail. Hours / Day", "Status"];
const BAND_LABEL: Record<LoadBand, string> = {
  Available: "Available", PartiallyAvailable: "Partially Available", FullyAllocated: "Fully Allocated", OverAllocated: "Over-allocated",
};
const dateValue = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function header(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.height = 32;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF203864" } };
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
}

function bodyRow(row: ExcelJS.Row, widths: number[]) {
  let lines = 1;
  row.eachCell({ includeEmpty: true }, (cell, index) => {
    cell.font = { name: "Calibri", size: 11, color: { argb: "FF161616" } };
    cell.alignment = { vertical: "middle", wrapText: true, horizontal: typeof cell.value === "number" || cell.value instanceof Date ? "center" : "left" };
    cell.border = { bottom: { style: "hair", color: { argb: "FFCCCCCC" } }, right: { style: "hair", color: { argb: "FFCCCCCC" } } };
    if (typeof cell.value === "string") {
      lines = Math.max(lines, cell.value.split("\n").reduce((sum, text) => sum + Math.max(1, Math.ceil(text.length / (widths[index - 1] - 2))), 0));
    }
  });
  row.height = Math.min(409, Math.max(24, lines * 15 + 6));
}

export function createAllocationWorkbook(people: Person[], projects: Project[], assignments: Assignment[], asOf: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.creator = "Capcio";
  workbook.title = "AppLab Team - Resource Allocation & Skills";
  const sheet = workbook.addWorksheet("Resource Allocation", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 4 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const widths = [23, 30, 32, 15, 15, 15, 16, 15, 19, 24];
  sheet.columns = widths.map((width) => ({ width }));
  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = workbook.title;
  sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true };
  sheet.getRow(1).height = 30;
  sheet.mergeCells("A2:J2");
  sheet.getCell("A2").value = "8-hour day: 25% = 2h, 50% = 4h, 75% = 6h, 100% = 8h | Maroon: end date passed | Amber: ending within 30 days (relative to today)";
  sheet.getCell("A2").font = { name: "Calibri", size: 10, italic: true };
  sheet.getRow(2).height = 22;
  sheet.mergeCells("A3:J3");
  sheet.getCell("A3").value = `As of ${asOf} | Live projects only; past and future assignments shown. Totals use active assignments and repeat per person; do not sum repeated totals.`;
  sheet.getCell("A3").font = { name: "Calibri", size: 10, color: { argb: "FF555555" } };
  sheet.getRow(3).height = 22;
  sheet.getRow(4).values = HEADERS;
  header(sheet, 4);
  sheet.pageSetup.printTitlesRow = "1:4";

  const history = workbook.addWorksheet("Deadline Changes", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  const historyWidths = [23, 32, 40, 23, 17, 17, 40, 65, 24];
  history.columns = historyWidths.map((width) => ({ width }));
  history.addRow(["Resource Name", "Project Name", "Work", "Change Type", "Previous Deadline", "Revised Deadline", "Reason", "Description", "Recorded At (UTC)"]);
  header(history, 1);

  const projectsById = new Map(projects.filter((project) => project.state !== "Completed").map((project) => [project.id, project]));

  for (const person of [...people].sort((a, b) => a.name.localeCompare(b.name))) {
    const load = calculateLoad(person.id, assignments, projectsById, asOf);
    const personAssignments = assignments.filter((a) => a.personId === person.id && projectsById.has(a.projectId))
      .sort((a, b) => a.projectName.localeCompare(b.projectName) || a.start.localeCompare(b.start));
    for (const assignment of personAssignments.length ? personAssignments : [null]) {
      const project = assignment ? projectsById.get(assignment.projectId) : undefined;
      const row = sheet.addRow([person.name, assignment ? assignmentDescription(project, assignment.work) : "", project?.name ?? "Unassigned",
        assignment ? assignment.alloc / 100 : 0, assignment ? dateValue(assignment.start) : null, assignment ? dateValue(assignment.end) : null,
        load / 100, load * 8 / 100, Math.max(0, 100 - load) * 8 / 100, BAND_LABEL[getLoadBand(load)]]);
      bodyRow(row, widths);
      for (const col of [4, 7]) row.getCell(col).numFmt = "0%";
      for (const col of [5, 6]) row.getCell(col).numFmt = "dd-mmm-yyyy";
      for (const col of [8, 9]) row.getCell(col).numFmt = '0.0"h"';
      row.getCell(10).font = { ...row.getCell(10).font, bold: true };

      for (const change of assignment?.deadlineExtensions ?? []) {
        const entry = history.addRow([person.name, project?.name ?? assignment!.projectName, assignment!.work,
          deadlineStyle(change).label, dateValue(change.previousDeadline), dateValue(change.newDeadline),
          change.reasonCategory || "Not recorded", change.reason || "Not recorded", new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(change.recordedAt) ? change.recordedAt : `${change.recordedAt}Z`)]);
        bodyRow(entry, historyWidths);
        for (const col of [5, 6]) entry.getCell(col).numFmt = "dd-mmm-yyyy";
        entry.getCell(9).numFmt = "dd-mmm-yyyy hh:mm";
      }
    }
  }
  if (sheet.rowCount >= 5) {
    sheet.addConditionalFormatting({
      ref: `A5:J${sheet.rowCount}`,
      rules: ([
        ["overdue", "AND(ISNUMBER($F5),$F5<TODAY())"],
        ["endingSoon", "AND(ISNUMBER($F5),$F5>=TODAY(),$F5<=TODAY()+30)"],
      ] as const).map(([status, formula], index) => ({
        type: "expression", priority: index + 1, formulae: [formula],
        style: {
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ALLOCATION_DATE_COLORS[status].background.slice(1).toUpperCase()}` } },
          font: { color: { argb: `FF${ALLOCATION_DATE_COLORS[status].color.slice(1).toUpperCase()}` } },
        },
      })),
    });
  }
  sheet.autoFilter = { from: "A4", to: `J${Math.max(4, sheet.rowCount)}` };
  history.autoFilter = { from: "A1", to: `I${Math.max(1, history.rowCount)}` };
  return workbook;
}

export async function downloadAllocationWorkbook(people: Person[], projects: Project[], assignments: Assignment[], asOf: string) {
  const workbook = createAllocationWorkbook(people, projects, assignments, asOf);
  await downloadWorkbook(workbook, asOf);
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, asOf: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `AppLab-Resource-Allocation-${asOf}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
