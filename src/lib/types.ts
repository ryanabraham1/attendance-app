export const ATTENDANCE_STATUSES = ["present", "late", "excused", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type Member = {
  id: string;
  name: string;
  group_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export type Practice = {
  id: string;
  title: string;
  starts_at: string;
  focus: string;
  created_at: string;
};

export type AttendanceEntry = {
  member_id: string;
  status: AttendanceStatus;
  note: string;
};

