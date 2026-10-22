export type SchoolStatus = "in-school" | "out-of-school";

export const schoolStatusKey = "studentsave:school-status";
export const schoolStatusEvent = "studentsave:school-status-updated";
export const schoolStatusLabels: Record<SchoolStatus, string> = {
  "in-school": "In school",
  "out-of-school": "Out of school",
};

export function readSchoolStatus(storage: Pick<Storage, "getItem">): SchoolStatus | null {
  const status = storage.getItem(schoolStatusKey);
  return status === "in-school" || status === "out-of-school" ? status : null;
}
