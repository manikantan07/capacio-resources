import type { Person } from "../types";

export const STATUS_LABEL: Record<Person["status"], string> = {
  Active: "Active",
  OnLeave: "On leave",
  SickLeave: "Sick leave",
  NoticePeriod: "Notice period",
};

export const TYPE_LABEL: Record<Person["type"], string> = {
  FullTime: "Full-time",
  PartTime: "Part-time",
  Contract: "Contract",
  Intern: "Intern",
};
