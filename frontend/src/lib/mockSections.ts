export interface SectionMeta {
  name: string;
  capacity: number;
  startDate: string;
  endDate: string;
}

export const INITIAL_SECTIONS: SectionMeta[] = [
  { name: "Intro to Design — Section B", capacity: 50, startDate: "2025-08-12", endDate: "2025-09-23" },
  { name: "Data Structures", capacity: 40, startDate: "2025-08-01", endDate: "2025-12-12" },
];
