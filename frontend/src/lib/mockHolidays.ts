export type HolidayScope = "staff" | "students" | "center";

export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO "YYYY-MM-DD"
  scope: HolidayScope;
}

export const SCOPE_LABEL: Record<HolidayScope, string> = {
  staff: "Staff only",
  students: "Students only",
  center: "Center-wide",
};

export const INITIAL_HOLIDAYS: Holiday[] = [
  { id: "1", name: "Founders' Day", date: "2026-09-25", scope: "center" },
  { id: "2", name: "Staff Development Day", date: "2026-09-18", scope: "staff" },
  { id: "3", name: "Fall Break", date: "2026-09-30", scope: "students" },
];
