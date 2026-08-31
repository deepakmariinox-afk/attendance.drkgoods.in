import ExcelJS from 'exceljs';
import { DailyAttendance, Employee, LeaveRequest, PayrollRecord, WorkLocation } from '../types';
import { downloadBlob } from './fileDownloader';
import { formatIsoToLocalTime, formatIsoToLocalDate } from './dateUtils';

/**
 * Helper to trigger browser download of an ExcelJS workbook as .xlsx
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  return downloadBlob(blob, safeFilename);
}

/**
 * Standard Header and Row Styling helper for ExcelJS Worksheets
 */
function applyTableStyles(
  worksheet: ExcelJS.Worksheet,
  headerFillColor = '1E293B', // Slate 800
  headerTextColor = 'FFFFFF'
) {
  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: headerTextColor } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerFillColor },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.font = { name: 'Calibri', size: 10 };
    row.height = 20;
    row.alignment = { vertical: 'middle' };

    // Alternate row zebra striping
    if (rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' }, // Slate 50
      };
    }

    // Add subtle grid borders
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });
  });

  // Auto-fit column widths with minimum padding
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    if (column.header) {
      maxLength = Math.max(maxLength, column.header.toString().length + 4);
    }
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length + 3);
    });
    column.width = Math.min(Math.max(maxLength, 12), 45);
  });
}

/**
 * 1. MASTER EXPORT: Export ALL system records into a multi-tab comprehensive Excel Workbook
 */
export async function exportAllRecordsToExcel({
  employees,
  attendance,
  payrollRecords,
  leaves,
  locations,
  selectedMonth = '2026-08',
  exportedBy = 'Admin / Deepak Yadav',
}: {
  employees: Employee[];
  attendance: DailyAttendance[];
  payrollRecords: PayrollRecord[];
  leaves: LeaveRequest[];
  locations: WorkLocation[];
  selectedMonth?: string;
  exportedBy?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise Attendance System';
  workbook.lastModifiedBy = exportedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // TAB 1: ATTENDANCE MASTER
  // -------------------------------------------------------------
  const attSheet = workbook.addWorksheet('Attendance Master');
  attSheet.columns = [
    { header: 'Record ID', key: 'id' },
    { header: 'Date', key: 'date' },
    { header: 'Day', key: 'day' },
    { header: 'Employee ID', key: 'employeeId' },
    { header: 'Staff Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'designation' },
    { header: 'Attendance Status', key: 'status' },
    { header: 'Check-In Time', key: 'checkInTime' },
    { header: 'Check-Out Time', key: 'checkOutTime' },
    { header: 'Work Duration (Hrs)', key: 'workHours' },
    { header: 'Overtime (Hrs)', key: 'overtimeHours' },
    { header: 'GPS Verification', key: 'gpsStatus' },
    { header: 'Total Punches', key: 'punchCount' },
    { header: 'Audit / Manager Notes', key: 'notes' },
  ];

  // Sort attendance by date descending
  const sortedAttendance = [...attendance].sort((a, b) => b.date.localeCompare(a.date));

  sortedAttendance.forEach((rec) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    const dayName = formatIsoToLocalDate(rec.date, { includeWeekday: true }).split(',')[0];

    const inTime = formatIsoToLocalTime(rec.checkInTime);
    const outTime = formatIsoToLocalTime(rec.checkOutTime);
    const workHrs = Number(((rec.totalWorkMinutes || 0) / 60).toFixed(2));
    const otHrs = Number(((rec.overtimeMinutes || 0) / 60).toFixed(2));
    const gpsStatus = rec.isFlaggedForGps
      ? rec.flagResolved
        ? 'Flagged (Resolved)'
        : 'Flagged (Out of Bounds)'
      : 'GPS Verified (In Office)';

    attSheet.addRow({
      id: rec.id,
      date: rec.date,
      day: dayName,
      employeeId: rec.employeeId,
      employeeName: emp?.name || 'Unknown',
      department: emp?.department || '--',
      designation: emp?.designation || '--',
      status: rec.status.toUpperCase(),
      checkInTime: inTime,
      checkOutTime: outTime,
      workHours: workHrs,
      overtimeHours: otHrs,
      gpsStatus,
      punchCount: rec.punches.length,
      notes: rec.notes || (rec.flagResolved ? 'Manager approved exception' : ''),
    });
  });
  applyTableStyles(attSheet, '0F172A');

  // -------------------------------------------------------------
  // TAB 2: DETAILED GPS PUNCH TELEMETRY LOGS
  // -------------------------------------------------------------
  const punchSheet = workbook.addWorksheet('GPS Punch Telemetry');
  punchSheet.columns = [
    { header: 'Punch ID', key: 'punchId' },
    { header: 'Timestamp', key: 'timestamp' },
    { header: 'Date', key: 'date' },
    { header: 'Time', key: 'time' },
    { header: 'Staff ID', key: 'employeeId' },
    { header: 'Staff Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Punch Type', key: 'type' },
    { header: 'Office Location', key: 'locationName' },
    { header: 'Latitude', key: 'lat' },
    { header: 'Longitude', key: 'lng' },
    { header: 'Distance from Office (m)', key: 'distance' },
    { header: 'Inside Geofence Perimeter', key: 'inside' },
    { header: 'OTP Verified (Mobile 4-Digit)', key: 'otp' },
    { header: 'Device Information', key: 'device' },
    { header: 'Manager Override / Remote Note', key: 'note' },
  ];

  const allPunches = attendance.flatMap((rec) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    return rec.punches.map((p) => {
      const timeStr = formatIsoToLocalTime(p.timestamp, { includeSeconds: true });
      return {
        punchId: p.id,
        timestamp: p.timestamp,
        date: rec.date,
        time: timeStr,
        employeeId: rec.employeeId,
        employeeName: emp?.name || 'Unknown',
        department: emp?.department || '--',
        type: p.type.toUpperCase().replace('_', ' '),
        locationName: p.locationName || 'DRK Goods HQ',
        lat: p.coordinates.latitude,
        lng: p.coordinates.longitude,
        distance: p.distanceFromOfficeMeters,
        inside: p.isWithinGeofence ? 'YES (Within Radius)' : 'NO (Out of Bounds)',
        otp: p.otpVerified ? 'YES (Verified)' : 'NO',
        device: p.deviceInfo || 'Workstation Browser',
        note: p.overrideNote || '',
      };
    });
  });

  allPunches.forEach((p) => punchSheet.addRow(p));
  applyTableStyles(punchSheet, '1E3A8A'); // Blue 900

  // -------------------------------------------------------------
  // TAB 3: PAYROLL MASTER LEDGER
  // -------------------------------------------------------------
  const payrollSheet = workbook.addWorksheet('Payroll Master Ledger');
  payrollSheet.columns = [
    { header: 'Staff ID', key: 'employeeId' },
    { header: 'Employee Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'role' },
    { header: 'Pay Period', key: 'month' },
    { header: 'Basic Salary (INR 15,000 Base)', key: 'baseSalary' },
    { header: 'Days Present', key: 'daysPresent' },
    { header: 'Days Late', key: 'daysLate' },
    { header: 'Days Absent', key: 'daysAbsent' },
    { header: 'Regular Work Hours', key: 'regularHours' },
    { header: 'Overtime Hours', key: 'otHours' },
    { header: 'Regular Basic Pay (INR)', key: 'regularPay' },
    { header: 'Overtime Pay (INR)', key: 'overtimePay' },
    { header: 'Bonuses (INR)', key: 'bonuses' },
    { header: 'PF 12% Deduction (INR 1,800)', key: 'pfDeduction' },
    { header: 'Total Penalties & Deductions (INR)', key: 'deductions' },
    { header: 'Net Disbursed Pay (INR)', key: 'netPay' },
    { header: 'Payment Status', key: 'status' },
  ];

  payrollRecords.forEach((pr) => {
    payrollSheet.addRow({
      employeeId: pr.employeeId,
      employeeName: pr.employeeName,
      department: pr.department,
      role: pr.employeeRole,
      month: pr.month,
      baseSalary: pr.baseSalary,
      daysPresent: pr.daysPresent,
      daysLate: pr.daysLate,
      daysAbsent: pr.daysAbsent,
      regularHours: pr.totalRegularHours,
      otHours: pr.totalOvertimeHours,
      regularPay: pr.regularPay,
      overtimePay: pr.overtimePay,
      bonuses: pr.bonuses,
      pfDeduction: pr.pfDeduction || 1800,
      deductions: pr.deductions,
      netPay: pr.netPay,
      status: pr.paymentStatus.toUpperCase(),
    });
  });
  applyTableStyles(payrollSheet, '14532D'); // Green 900

  // -------------------------------------------------------------
  // TAB 4: EMPLOYEE DIRECTORY & PROFILES
  // -------------------------------------------------------------
  const empSheet = workbook.addWorksheet('Employee Directory');
  empSheet.columns = [
    { header: 'Staff ID', key: 'id' },
    { header: 'Full Name', key: 'name' },
    { header: 'Mobile Number (OTP ID)', key: 'phone' },
    { header: 'Email Address', key: 'email' },
    { header: 'Access Role', key: 'role' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'designation' },
    { header: 'Basic Salary (INR)', key: 'baseSalary' },
    { header: 'PF 12% Deduction (INR)', key: 'pfDeduction' },
    { header: 'Overtime Multiplier', key: 'otMultiplier' },
    { header: 'Assigned Geofence Office', key: 'office' },
    { header: 'Bank Direct Deposit Account', key: 'bank' },
  ];

  employees.forEach((emp) => {
    const loc = locations.find((l) => l.id === emp.assignedLocationId);
    empSheet.addRow({
      id: emp.id,
      name: emp.name,
      phone: emp.phone || 'N/A',
      email: emp.email || 'N/A',
      role: emp.role.toUpperCase(),
      department: emp.department,
      designation: emp.designation,
      baseSalary: emp.monthlyBaseSalary || 15000,
      pfDeduction: 1800,
      otMultiplier: `${emp.overtimeRateMultiplier || 1.5}x`,
      office: loc?.name || 'DRK Goods HQ',
      bank: emp.bankAccount,
    });
  });
  applyTableStyles(empSheet, '581C87'); // Purple 900

  // -------------------------------------------------------------
  // TAB 5: LEAVE REQUESTS & APPROVALS
  // -------------------------------------------------------------
  const leaveSheet = workbook.addWorksheet('Leave Management');
  leaveSheet.columns = [
    { header: 'Leave Request ID', key: 'id' },
    { header: 'Employee ID', key: 'employeeId' },
    { header: 'Staff Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Leave Type', key: 'type' },
    { header: 'Start Date', key: 'startDate' },
    { header: 'End Date', key: 'endDate' },
    { header: 'Total Days', key: 'days' },
    { header: 'Reason', key: 'reason' },
    { header: 'Approval Status', key: 'status' },
    { header: 'Application Date', key: 'appliedAt' },
    { header: 'Reviewed By', key: 'reviewedBy' },
  ];

  leaves.forEach((l) => {
    const emp = employees.find((e) => e.id === l.employeeId);
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    leaveSheet.addRow({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: emp?.name || 'Staff Member',
      department: emp?.department || '--',
      type: l.type.toUpperCase(),
      startDate: l.startDate,
      endDate: l.endDate,
      days: isNaN(days) ? 1 : days,
      reason: l.reason,
      status: l.status.toUpperCase(),
      appliedAt: l.appliedOn || '--',
      reviewedBy: l.reviewedBy || 'Manager / Admin',
    });
  });
  applyTableStyles(leaveSheet, '78350F'); // Amber 900

  // -------------------------------------------------------------
  // TAB 6: GEOFENCE WORKSITE LOCATIONS
  // -------------------------------------------------------------
  const locSheet = workbook.addWorksheet('Geofence Worksites');
  locSheet.columns = [
    { header: 'Location ID', key: 'id' },
    { header: 'Office / Facility Name', key: 'name' },
    { header: 'Full Physical Address', key: 'address' },
    { header: 'GPS Latitude', key: 'lat' },
    { header: 'GPS Longitude', key: 'lng' },
    { header: 'Permitted Geofence Radius (Meters)', key: 'radius' },
    { header: 'Assigned Staff Count', key: 'staffCount' },
  ];

  locations.forEach((loc) => {
    const assignedCount = employees.filter((e) => e.assignedLocationId === loc.id).length;
    locSheet.addRow({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      lat: loc.latitude,
      lng: loc.longitude,
      radius: `${loc.radiusMeters} meters`,
      staffCount: assignedCount,
    });
  });
  applyTableStyles(locSheet, '334155'); // Slate 700

  const todayStr = new Date().toISOString().slice(0, 10);
  const filename = `DRK_Goods_Master_Workforce_Database_${todayStr}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * 2. Export Monthly Payroll Ledger to Excel
 */
export async function exportMonthlyPayrollExcel(
  records: PayrollRecord[],
  monthName: string,
  generatedBy: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise';
  workbook.lastModifiedBy = generatedBy;

  const sheet = workbook.addWorksheet('Payroll Ledger');
  sheet.columns = [
    { header: 'No.', key: 'num' },
    { header: 'Staff ID', key: 'employeeId' },
    { header: 'Staff Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'role' },
    { header: 'Basic Salary (INR)', key: 'baseSalary' },
    { header: 'Days Present', key: 'present' },
    { header: 'Days Late', key: 'late' },
    { header: 'Days Absent', key: 'absent' },
    { header: 'Regular Hours', key: 'regHours' },
    { header: 'OT Hours', key: 'otHours' },
    { header: 'Regular Pay (INR)', key: 'regPay' },
    { header: 'OT Pay (INR)', key: 'otPay' },
    { header: 'Bonuses (INR)', key: 'bonuses' },
    { header: 'PF 12% (INR 1,800)', key: 'pfDeduction' },
    { header: 'Total Deductions (INR)', key: 'deductions' },
    { header: 'Net Disbursed Pay (INR)', key: 'netPay' },
    { header: 'Disbursement Status', key: 'status' },
  ];

  records.forEach((r, idx) => {
    sheet.addRow({
      num: idx + 1,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      department: r.department,
      role: r.employeeRole,
      baseSalary: r.baseSalary,
      present: r.daysPresent,
      late: r.daysLate,
      absent: r.daysAbsent,
      regHours: r.totalRegularHours,
      otHours: r.totalOvertimeHours,
      regPay: r.regularPay,
      otPay: r.overtimePay,
      bonuses: r.bonuses,
      pfDeduction: r.pfDeduction || 1800,
      deductions: r.deductions,
      netPay: r.netPay,
      status: r.paymentStatus.toUpperCase(),
    });
  });

  applyTableStyles(sheet, '1E293B');

  const filename = `DRK_Goods_Payroll_Ledger_${monthName.replace(/\s+/g, '_')}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * 3. Export Attendance Records (All or Monthly Filtered) to Excel
 */
export async function exportAttendanceExcel(
  attendanceList: DailyAttendance[],
  employees: Employee[],
  monthStr: string,
  title = 'DRK Goods Attendance Records'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise';

  const sheet = workbook.addWorksheet('Attendance');
  sheet.columns = [
    { header: 'No.', key: 'num' },
    { header: 'Date', key: 'date' },
    { header: 'Staff ID', key: 'employeeId' },
    { header: 'Employee Name', key: 'employeeName' },
    { header: 'Department', key: 'department' },
    { header: 'Designation', key: 'designation' },
    { header: 'Status', key: 'status' },
    { header: 'Check-In Time', key: 'checkIn' },
    { header: 'Check-Out Time', key: 'checkOut' },
    { header: 'Work Duration (Hrs)', key: 'workHours' },
    { header: 'Overtime (Hrs)', key: 'otHours' },
    { header: 'GPS Verification', key: 'gpsStatus' },
    { header: 'Notes / Location Info', key: 'notes' },
  ];

  const filtered = attendanceList.filter((a) => a.date.startsWith(monthStr));
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  filtered.forEach((rec, idx) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    sheet.addRow({
      num: idx + 1,
      date: rec.date,
      employeeId: rec.employeeId,
      employeeName: emp?.name || 'Staff',
      department: emp?.department || '--',
      designation: emp?.designation || '--',
      status: rec.status.toUpperCase(),
      checkIn: formatIsoToLocalTime(rec.checkInTime),
      checkOut: formatIsoToLocalTime(rec.checkOutTime),
      workHours: Number(((rec.totalWorkMinutes || 0) / 60).toFixed(2)),
      otHours: Number(((rec.overtimeMinutes || 0) / 60).toFixed(2)),
      gpsStatus: rec.isFlaggedForGps ? 'Flagged (Out of Radius)' : 'GPS Verified',
      notes: rec.notes || '',
    });
  });

  applyTableStyles(sheet, '1E3A8A');

  const filename = `DRK_Goods_Attendance_Records_${monthStr}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * 4. Export Individual Staff Member Monthly Attendance to Excel
 */
export async function exportIndividualAttendanceExcel(
  employee: Employee,
  attendanceList: DailyAttendance[],
  monthStr: string,
  location: WorkLocation
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise';

  const sheet = workbook.addWorksheet(`${employee.name.slice(0, 20)} Attendance`);
  sheet.columns = [
    { header: 'Date', key: 'date' },
    { header: 'Day', key: 'day' },
    { header: 'Attendance Status', key: 'status' },
    { header: 'Check-In Time', key: 'checkIn' },
    { header: 'Check-Out Time', key: 'checkOut' },
    { header: 'Work Duration (Hours)', key: 'workHours' },
    { header: 'Overtime (Hours)', key: 'otHours' },
    { header: 'GPS Office Perimeter', key: 'gpsStatus' },
    { header: 'Punch Notes / Details', key: 'notes' },
  ];

  const records = attendanceList
    .filter((a) => a.employeeId === employee.id && a.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  records.forEach((rec) => {
    const day = formatIsoToLocalDate(rec.date, { includeWeekday: true }).split(',')[0];
    sheet.addRow({
      date: rec.date,
      day,
      status: rec.status.toUpperCase(),
      checkIn: formatIsoToLocalTime(rec.checkInTime),
      checkOut: formatIsoToLocalTime(rec.checkOutTime),
      workHours: Number(((rec.totalWorkMinutes || 0) / 60).toFixed(2)),
      otHours: Number(((rec.overtimeMinutes || 0) / 60).toFixed(2)),
      gpsStatus: rec.isFlaggedForGps ? 'Remote / Flagged' : `Verified (${location.name})`,
      notes: rec.notes || '',
    });
  });

  applyTableStyles(sheet, '0F172A');

  const filename = `Attendance_${employee.name.replace(/\s+/g, '_')}_${monthStr}.xlsx`;
  await downloadWorkbook(workbook, filename);
}

/**
 * 5. Export Staff Directory to Excel
 */
export async function exportStaffDirectoryExcel(
  employees: Employee[],
  locations: WorkLocation[] = []
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise';

  const sheet = workbook.addWorksheet('Staff Directory');
  sheet.columns = [
    { header: 'Staff ID', key: 'id' },
    { header: 'Staff Full Name', key: 'name' },
    { header: 'Mobile Phone (OTP Verification)', key: 'phone' },
    { header: 'Email Address', key: 'email' },
    { header: 'Role', key: 'role' },
    { header: 'Department', key: 'department' },
    { header: 'Designation / Title', key: 'designation' },
    { header: 'Day-wise Week Off', key: 'weekOff' },
    { header: 'Yearly CTC (INR)', key: 'yearlySalary' },
    { header: 'Monthly Base Salary (INR)', key: 'baseSalary' },
    { header: 'Assigned Geofence Office', key: 'office' },
    { header: 'Bank Direct Deposit Details', key: 'bank' },
  ];

  employees.forEach((emp) => {
    const loc = locations.find((l) => l.id === emp.assignedLocationId);
    const weekOffStr = emp.weekOffDays && emp.weekOffDays.length > 0 ? emp.weekOffDays.join(', ') : 'Company Default (Sunday)';
    sheet.addRow({
      id: emp.id,
      name: emp.name,
      phone: emp.phone || 'N/A',
      email: emp.email || 'N/A',
      role: emp.role.toUpperCase(),
      department: emp.department,
      designation: emp.designation,
      weekOff: weekOffStr,
      yearlySalary: emp.yearlySalary || 1440000,
      baseSalary: emp.monthlyBaseSalary,
      office: loc?.name || 'DRK Goods HQ',
      bank: emp.bankAccount,
    });
  });

  applyTableStyles(sheet, '1E293B');

  const filename = `DRK_Goods_Staff_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await downloadWorkbook(workbook, filename);
}
