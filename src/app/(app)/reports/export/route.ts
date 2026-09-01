import ExcelJS from "exceljs";
import { requireLead, scopedGroup } from "@/lib/auth";
import { getAttendanceExportData } from "@/lib/db";
import { pacificDateKey } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PURPLE = "6B3FD4";
const PALE_PURPLE = "EEE9FB";
const WHITE = "FFFFFF";

function pacificExcelDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(
    Number(byType.year),
    Number(byType.month) - 1,
    Number(byType.day),
    Number(byType.hour),
    Number(byType.minute),
    Number(byType.second),
  ));
}

function styleSheet(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: widths.length } };
  sheet.getRow(1).height = 24;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PURPLE } };
    cell.alignment = { vertical: "middle" };
  });
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE_PURPLE } };
      });
    }
    row.alignment = { vertical: "top" };
  });
}

function countStatuses(statuses: AttendanceStatus[]) {
  return {
    present: statuses.filter((status) => status === "present").length,
    late: statuses.filter((status) => status === "late").length,
    excused: statuses.filter((status) => status === "excused").length,
    absent: statuses.filter((status) => status === "absent").length,
  };
}

export async function GET() {
  const session = await requireLead();
  const group = scopedGroup(session);
  const { practices, members, attendance } = await getAttendanceExportData(group);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const practiceById = new Map(practices.map((practice) => [practice.id, practice]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WarriorBorgs Attendance";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const attendanceSheet = workbook.addWorksheet("Attendance", { properties: { tabColor: { argb: PURPLE } } });
  attendanceSheet.addRow(["Meeting Date", "Meeting", "Member", "Subteam", "Role", "Status", "Note", "Last Updated"]);
  attendance
    .map((entry) => ({ entry, member: memberById.get(entry.member_id), practice: practiceById.get(entry.practice_id) }))
    .filter((item) => item.member && item.practice)
    .sort((a, b) => new Date(b.practice!.starts_at).getTime() - new Date(a.practice!.starts_at).getTime() || a.member!.name.localeCompare(b.member!.name))
    .forEach(({ entry, member, practice }) => {
      attendanceSheet.addRow([
        pacificExcelDate(practice!.starts_at),
        practice!.title,
        member!.name,
        member!.group_name,
        member!.role,
        entry.status[0].toUpperCase() + entry.status.slice(1),
        entry.note,
        pacificExcelDate(entry.checked_at),
      ]);
    });
  attendanceSheet.getColumn(1).numFmt = "mmm d, yyyy h:mm AM/PM";
  attendanceSheet.getColumn(8).numFmt = "mmm d, yyyy h:mm AM/PM";
  attendanceSheet.getColumn(7).alignment = { wrapText: true, vertical: "top" };
  styleSheet(attendanceSheet, [23, 18, 24, 16, 18, 12, 34, 23]);

  const summarySheet = workbook.addWorksheet("Member Summary", { properties: { tabColor: { argb: "178558" } } });
  summarySheet.addRow(["Member", "Subteam", "Role", "Active", "Recorded", "Present", "Late", "Excused", "Absent", "Attendance Rate"]);
  members.forEach((member) => {
    const entries = attendance.filter((entry) => entry.member_id === member.id);
    const counts = countStatuses(entries.map((entry) => entry.status));
    const rated = counts.present + counts.late + counts.absent;
    const rate = rated ? (counts.present + counts.late) / rated : 1;
    const row = summarySheet.addRow([
      member.name,
      member.group_name,
      member.role,
      member.active ? "Yes" : "No",
      entries.length,
      counts.present,
      counts.late,
      counts.excused,
      counts.absent,
      { formula: `IF((F${summarySheet.rowCount + 1}+G${summarySheet.rowCount + 1}+I${summarySheet.rowCount + 1})=0,1,(F${summarySheet.rowCount + 1}+G${summarySheet.rowCount + 1})/(F${summarySheet.rowCount + 1}+G${summarySheet.rowCount + 1}+I${summarySheet.rowCount + 1}))`, result: rate },
    ]);
    row.getCell(10).numFmt = "0%";
  });
  styleSheet(summarySheet, [24, 16, 18, 10, 11, 11, 9, 11, 10, 18]);

  const meetingsSheet = workbook.addWorksheet("Meetings", { properties: { tabColor: { argb: "18151F" } } });
  meetingsSheet.addRow(["Meeting Date", "Meeting", "Focus", "Recorded", "Present", "Late", "Excused", "Absent"]);
  practices.forEach((practice) => {
    const statuses = attendance.filter((entry) => entry.practice_id === practice.id).map((entry) => entry.status);
    const counts = countStatuses(statuses);
    meetingsSheet.addRow([
      pacificExcelDate(practice.starts_at),
      practice.title,
      practice.focus,
      statuses.length,
      counts.present,
      counts.late,
      counts.excused,
      counts.absent,
    ]);
  });
  meetingsSheet.getColumn(1).numFmt = "mmm d, yyyy h:mm AM/PM";
  meetingsSheet.getColumn(3).alignment = { wrapText: true, vertical: "top" };
  styleSheet(meetingsSheet, [23, 18, 32, 12, 11, 9, 11, 10]);

  const buffer = await workbook.xlsx.writeBuffer();
  const scope = group ? `-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";
  const filename = `attendance${scope}-${pacificDateKey()}.xlsx`;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
