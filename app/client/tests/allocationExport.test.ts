import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { createAllocationWorkbook } from "../src/lib/allocationExport";
import { allocationDateStatus } from "../src/lib/allocationDateColors";
import { projectDescription, completedProjectDescription } from "../src/lib/projectDescription";
import type { Assignment, Person, Project, CompletedProject } from "../src/types";

const asOf = "2026-09-23";
const formatting = (sheet: ExcelJS.Worksheet) => (sheet.model as ExcelJS.WorksheetModel & {
  conditionalFormattings: ExcelJS.ConditionalFormattingOptions[];
}).conditionalFormattings;
const person = (id: string, name = id): Person => ({ id, name, skills: ["React", "HTML"], status: "Active" } as Person);
const project = (id: string, state: Project["state"] = "Active"): Project => ({ id, name: id, state } as Project);
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: "a1", personId: "Nihal", personName: "Nihal", projectId: "EC", projectName: "EC", work: "HTML/CSS page",
  alloc: 75, start: "2026-08-12", end: "2026-09-28", active: true, deadlineExtensions: [], ...overrides,
});

test("exports everyone, including unassigned people, with numeric percentages and 8-hour availability", async () => {
  const workbook = createAllocationWorkbook([person("Nihal"), person("Mani")], [project("EC")], [assignment()], asOf);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const sheet = loaded.getWorksheet("Resource Allocation")!;
  assert.equal(sheet.rowCount, 6);
  assert.equal(sheet.getCell("A5").value, "Mani");
  assert.equal(sheet.getCell("C5").value, "Unassigned");
  assert.equal(sheet.getCell("B5").text, "");
  assert.equal(sheet.getCell("B6").value, "HTML/CSS page");
  assert.equal(sheet.getCell("I5").value, 8);
  assert.equal(sheet.getCell("J5").value, "Available");
  assert.equal(sheet.getCell("D6").value, 0.75);
  assert.equal(sheet.getCell("D6").numFmt, "0%");
  assert.equal(sheet.getCell("G6").value, 0.75);
  assert.equal(sheet.getCell("H6").value, 6);
  assert.equal(sheet.getCell("I6").value, 2);
  assert.equal(sheet.getCell("J6").value, "Partially Available");
  assert.equal((sheet.getCell("F6").value as Date).toISOString().slice(0, 10), "2026-09-28");
  assert.equal(sheet.views[0].state, "frozen");
  assert.equal(sheet.autoFilter, "A4:J6");
  assert.equal(sheet.columnCount, 10);
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => sheet.getRow(4).getCell(i + 1).text), ["Resource Name", "Skillset", "Project Name", "Allocation %", "Start Date", "End Date",
    "Total Alloc %", "Hours / Day", "Avail. Hours / Day", "Status"]);
});

test("only current live assignments affect totals; past and future rows remain visible", () => {
  const assignments = [assignment(), assignment({ id: "future", start: "2026-09-24", end: "2026-11-01", alloc: 100 }),
    assignment({ id: "past", end: "2026-09-22", alloc: 100 }), assignment({ id: "completed", projectId: "Old", alloc: 100 })];
  const sheet = createAllocationWorkbook([person("Nihal")], [project("EC"), project("Old", "Completed")], assignments, asOf).worksheets[0];
  assert.equal(sheet.rowCount, 7);
  for (let i = 5; i <= 7; i++) assert.equal(sheet.getCell(`G${i}`).value, 0.75);
  const rows = [5, 6, 7].map((i) => sheet.getRow(i));
  assert.deepEqual(rows.map((r) => (r.getCell(6).value as Date).toISOString().slice(0, 10)).sort(), ["2026-09-22", "2026-09-28", "2026-11-01"]);
  for (const row of rows) row.eachCell((cell) => {
    assert.equal((cell.fill as ExcelJS.FillPattern | undefined)?.fgColor, undefined);
    assert.equal(cell.font.color?.argb, "FF161616");
  });
});

test("date boundaries are inclusive and over-allocation cannot produce negative available hours", () => {
  const sheet = createAllocationWorkbook([person("Nihal")], [project("EC", "Backlog")], [
    assignment({ start: asOf, end: asOf }), assignment({ id: "a2", end: "2026-10-23", alloc: 50 }),
  ], asOf).worksheets[0];
  for (const i of [5, 6]) {
    assert.equal(sheet.getCell(`G${i}`).value, 1.25);
    assert.equal(sheet.getCell(`H${i}`).value, 10);
    assert.equal(sheet.getCell(`I${i}`).value, 0);
    assert.equal(sheet.getCell(`J${i}`).value, "Over-allocated");
    assert.equal((sheet.getCell(`A${i}`).fill as ExcelJS.FillPattern | undefined)?.fgColor, undefined);
  }
});

test("exports custom reasons, descriptions and every historical date change as literal text", async () => {
  const a = assignment({ work: "=1+1", deadlineExtensions: [
    { previousDeadline: "2026-09-16", newDeadline: "2026-09-28", changeType: "DeadlineMissed", reasonCategory: "Custom reason", reason: "Line one\nLine two", recordedAt: "2026-09-21T10:00:00" },
    { previousDeadline: "2026-09-28", newDeadline: "2026-10-01", changeType: "DeadlineExtended", reasonCategory: "New client requirements", reason: "=HYPERLINK(\"https://example.com\")", recordedAt: "2026-09-22T13:00:00+03:00" },
  ] });
  const workbook = createAllocationWorkbook([person("Nihal")], [project("EC")], [a], asOf);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const history = loaded.getWorksheet("Deadline Changes")!;
  assert.equal(history.rowCount, 3);
  assert.equal(history.getCell("D2").value, "Deadline missed");
  assert.equal(history.getCell("D3").value, "Deadline extended");
  assert.equal(history.getCell("G2").value, "Custom reason");
  assert.equal(history.getCell("H2").value, "Line one\nLine two");
  assert.equal(history.getCell("H3").type, ExcelJS.ValueType.String);
  assert.equal(loaded.worksheets[0].getCell("B5").type, ExcelJS.ValueType.String);
  assert.equal((history.getCell("I3").value as Date).toISOString(), "2026-09-22T10:00:00.000Z");
});

test("empty teams still produce valid, labelled workbooks", () => {
  const workbook = createAllocationWorkbook([], [], [], asOf);
  assert.equal(workbook.worksheets[0].rowCount, 4);
  assert.equal(workbook.worksheets[1].rowCount, 1);
  assert.deepEqual(formatting(workbook.worksheets[0]), []);
});

test("Excel retains live TODAY conditional rules across all ten body columns after serialization", async () => {
  const workbook = createAllocationWorkbook([person("Nihal"), person("Mani")], [project("EC")], [assignment()], asOf);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const rules = formatting(loaded.worksheets[0]);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].ref, "A5:J6");
  assert.deepEqual(rules[0].rules.map(rule => ({ type: rule.type, formulae: (rule as ExcelJS.ExpressionRuleType).formulae })), [
    { type: "expression", formulae: ["AND(ISNUMBER($F5),$F5<TODAY())"] },
    { type: "expression", formulae: ["AND(ISNUMBER($F5),$F5>=TODAY(),$F5<=TODAY()+30)"] },
  ]);
  assert.deepEqual(rules[0].rules.map(rule => (rule.style?.fill as ExcelJS.FillPattern).fgColor?.argb), ["FF800000", "FFFFBF00"]);
  assert.deepEqual(rules[0].rules.map(rule => rule.style?.font?.color?.argb), ["FFFFFFFF", "FF161616"]);
  assert.equal(workbook.calcProperties.fullCalcOnLoad, true);
  assert.deepEqual(formatting(loaded.worksheets[1]), []);
});

test("preview date colours match inclusive Excel boundaries, revised dates and advancing calendar days", () => {
  const now = new Date(2026, 8, 23, 12);
  const end = (iso: string) => new Date(`${iso}T00:00:00Z`);
  assert.equal(allocationDateStatus(end("2026-09-22"), now), "overdue");
  assert.equal(allocationDateStatus(end("2026-09-23"), now), "endingSoon");
  assert.equal(allocationDateStatus(end("2026-10-23"), now), "endingSoon");
  assert.equal(allocationDateStatus(end("2026-10-24"), now), undefined);
  for (const blank of [null, undefined, "", new Date(NaN)]) assert.equal(allocationDateStatus(blank, now), undefined);
  assert.equal(allocationDateStatus(end("2026-09-28"), now), "endingSoon");
  assert.equal(allocationDateStatus(end("2026-09-28"), new Date(2026, 8, 29)), "overdue");
  assert.equal(allocationDateStatus(end("2027-01-01"), new Date(2026, 11, 2)), "endingSoon");
});

test("edited work is shared by the project subtitle and exported Skillset without changing personal skills", async () => {
  const p = { ...project("Thakira / QNL"), description: "Style support", tech: ["Style support"], cells: [
    { personId: "Nihal", assignmentId: "a1", alloc: 50, active: true, start: "2026-07-20", end: "2026-10-01", work: "Style support, and new updates" },
  ] };
  const a = assignment({ projectId: p.id, projectName: p.name, work: p.cells[0].work });
  const member = person("Nihal");
  const workbook = createAllocationWorkbook([member], [p], [a], asOf);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(loaded.worksheets[0].getCell("B5").value, "Style support, and new updates");
  assert.equal(loaded.worksheets[0].getCell("B5").value, projectDescription(p, asOf));
  assert.deepEqual(member.skills, ["React", "HTML"]);
  assert.deepEqual(p.tech, ["Style support"]);
});

test("missing work uses project description then project technologies, never a person's unrelated skills", () => {
  const p = { ...project("EC"), description: "HTML / CSS pages", tech: ["HTML", "CSS"] };
  const a = assignment({ work: "  " });
  const exportSkillset = () => createAllocationWorkbook([person("Nihal")], [p], [a], asOf).worksheets[0].getCell("B5").text;
  assert.equal(exportSkillset(), "HTML / CSS pages");
  p.description = "";
  assert.equal(exportSkillset(), "HTML, CSS");
  p.tech = [];
  assert.equal(exportSkillset(), "");
});

test("multiple contributors retain distinct work in export and current work is combined under the project", () => {
  const p = { ...project("EC"), cells: [
    { personId: "Nihal", assignmentId: "a1", alloc: 50, active: true, start: "2026-09-01", end: "2026-10-01", work: "Frontend updates" },
    { personId: "Mani", assignmentId: "a2", alloc: 50, active: true, start: "2026-09-01", end: "2026-10-01", work: "API integration" },
    { personId: "Mani", assignmentId: "a3", alloc: 50, active: false, start: "2026-01-01", end: "2026-01-31", work: "Old prototype" },
  ] };
  assert.equal(projectDescription(p, asOf), "Frontend updates; API integration");
  const sheet = createAllocationWorkbook([person("Nihal"), person("Mani")], [p], [
    assignment({ work: "Frontend updates" }), assignment({ id: "a2", personId: "Mani", work: "API integration" }),
  ], asOf).worksheets[0];
  assert.equal(sheet.getCell("B5").value, "API integration");
  assert.equal(sheet.getCell("B6").value, "Frontend updates");
});

test("completed project subtitles use saved work summaries rather than the original technology tags", () => {
  const p = { tech: ["React"], contributors: [{ workSummary: "Style support, and new updates" }] } as CompletedProject;
  assert.equal(completedProjectDescription(p), "Style support, and new updates");
  p.contributors = [];
  assert.equal(completedProjectDescription(p), "React");
});
