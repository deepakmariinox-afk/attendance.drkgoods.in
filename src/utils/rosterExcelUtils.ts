import ExcelJS from 'exceljs';
import { Employee, WorkShift, DayOfWeek } from '../types';
import { downloadBlob } from './fileDownloader';

const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface ParsedRosterRow {
  rowNumber: number;
  matchedEmployee?: Employee;
  rawEmpId?: string;
  rawEmpName?: string;
  rawPhone?: string;
  matchedShift?: WorkShift;
  rawShift?: string;
  parsedWeekOffDays: string[];
  rawWeekOff?: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
}

export interface RosterParseResult {
  filename: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  rows: ParsedRosterRow[];
  hasErrors: boolean;
}

/**
 * Applies header styling to ExcelJS Worksheet
 */
function applyHeaderStyle(worksheet: ExcelJS.Worksheet, headerFillColor = '1E293B') {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerFillColor },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.font = { name: 'Calibri', size: 10 };
    row.height = 20;
    row.alignment = { vertical: 'middle' };
    if (rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' },
      };
    }
  });
}

/**
 * Exports Weekly Roster Template (.xlsx)
 */
export async function exportWeeklyRosterTemplate(
  employees: Employee[],
  shifts: WorkShift[],
  companyWeekOffDays: string[] = ['Sunday'],
  filename = 'DRK_Goods_Weekly_Roster_Template.xlsx'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise Portal';
  workbook.created = new Date();

  // Sheet 1: Weekly Roster
  const sheet = workbook.addWorksheet('Weekly Roster');
  sheet.columns = [
    { header: 'Employee ID', key: 'id', width: 16 },
    { header: 'Employee Name', key: 'name', width: 24 },
    { header: 'Mobile Number', key: 'phone', width: 16 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Assigned Shift (Name or ID)', key: 'shift', width: 34 },
    { header: 'Day-wise Week Off Days', key: 'weekOff', width: 28 },
    { header: 'Monday Status / Shift', key: 'mon', width: 20 },
    { header: 'Tuesday Status / Shift', key: 'tue', width: 20 },
    { header: 'Wednesday Status / Shift', key: 'wed', width: 20 },
    { header: 'Thursday Status / Shift', key: 'thu', width: 20 },
    { header: 'Friday Status / Shift', key: 'fri', width: 20 },
    { header: 'Saturday Status / Shift', key: 'sat', width: 20 },
    { header: 'Sunday Status / Shift', key: 'sun', width: 20 },
    { header: 'Notes / Effective Week', key: 'notes', width: 24 },
  ];

  employees.forEach((emp) => {
    const shift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
    const offDays = emp.weekOffDays && emp.weekOffDays.length > 0 ? emp.weekOffDays : companyWeekOffDays;
    const offDaysStr = offDays.join(', ');

    const getDayState = (day: string) => (offDays.includes(day) ? 'OFF' : shift?.name || 'WORK');

    sheet.addRow({
      id: emp.id,
      name: emp.name,
      phone: emp.phone || '',
      department: emp.department,
      shift: shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : 'Standard General Shift',
      weekOff: offDaysStr,
      mon: getDayState('Monday'),
      tue: getDayState('Tuesday'),
      wed: getDayState('Wednesday'),
      thu: getDayState('Thursday'),
      fri: getDayState('Friday'),
      sat: getDayState('Saturday'),
      sun: getDayState('Sunday'),
      notes: 'Weekly Roster Active',
    });
  });

  applyHeaderStyle(sheet, '4C1D95'); // Deep purple header

  // Sheet 2: Available Shifts Reference
  const refSheet = workbook.addWorksheet('Shift Reference');
  refSheet.columns = [
    { header: 'Shift ID', key: 'id', width: 18 },
    { header: 'Shift Name', key: 'name', width: 30 },
    { header: 'Start Time', key: 'start', width: 14 },
    { header: 'End Time', key: 'end', width: 14 },
    { header: 'Grace Period (Mins)', key: 'grace', width: 20 },
    { header: 'Working Hours', key: 'hours', width: 16 },
  ];

  shifts.forEach((s) => {
    refSheet.addRow({
      id: s.id,
      name: s.name,
      start: s.startTime,
      end: s.endTime,
      grace: s.graceMinutes || 15,
      hours: s.workingHours || 9,
    });
  });

  applyHeaderStyle(refSheet, '1E293B');

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return downloadBlob(blob, filename);
}

/**
 * Exports Monthly Roster Template (.xlsx)
 */
export async function exportMonthlyRosterTemplate(
  employees: Employee[],
  shifts: WorkShift[],
  selectedMonth = 'August 2026',
  companyWeekOffDays: string[] = ['Sunday'],
  filename = 'DRK_Goods_Monthly_Roster_Template.xlsx'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DRK Goods Enterprise Portal';
  workbook.created = new Date();

  // Sheet 1: Monthly Roster
  const sheet = workbook.addWorksheet(`Monthly Roster - ${selectedMonth}`);
  sheet.columns = [
    { header: 'Employee ID', key: 'id', width: 16 },
    { header: 'Employee Name', key: 'name', width: 24 },
    { header: 'Mobile Number', key: 'phone', width: 16 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Designation', key: 'designation', width: 22 },
    { header: 'Month', key: 'month', width: 16 },
    { header: 'Assigned Shift (Name or ID)', key: 'shift', width: 34 },
    { header: 'Day-wise Week Off Days', key: 'weekOff', width: 28 },
    { header: 'Remarks / Special Notes', key: 'remarks', width: 26 },
  ];

  employees.forEach((emp) => {
    const shift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
    const offDays = emp.weekOffDays && emp.weekOffDays.length > 0 ? emp.weekOffDays : companyWeekOffDays;

    sheet.addRow({
      id: emp.id,
      name: emp.name,
      phone: emp.phone || '',
      department: emp.department,
      designation: emp.designation,
      month: selectedMonth,
      shift: shift ? `${shift.name} (${shift.startTime}-${shift.endTime})` : 'Standard General Shift',
      weekOff: offDays.join(', '),
      remarks: 'Monthly Roster Schedule',
    });
  });

  applyHeaderStyle(sheet, '1E1B4B'); // Dark indigo

  // Sheet 2: Shifts Reference
  const refSheet = workbook.addWorksheet('Shift Reference');
  refSheet.columns = [
    { header: 'Shift ID', key: 'id', width: 18 },
    { header: 'Shift Name', key: 'name', width: 30 },
    { header: 'Timings', key: 'timings', width: 20 },
    { header: 'Working Hours', key: 'hours', width: 16 },
  ];

  shifts.forEach((s) => {
    refSheet.addRow({
      id: s.id,
      name: s.name,
      timings: `${s.startTime} - ${s.endTime}`,
      hours: `${s.workingHours || 9} Hours`,
    });
  });

  applyHeaderStyle(refSheet, '1E293B');

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return downloadBlob(blob, filename);
}

/**
 * Exports CSV Roster Template (.csv)
 */
export function exportCsvRosterTemplate(
  employees: Employee[],
  shifts: WorkShift[],
  type: 'weekly' | 'monthly' = 'weekly',
  companyWeekOffDays: string[] = ['Sunday']
) {
  const headers =
    type === 'weekly'
      ? [
          'Employee ID',
          'Employee Name',
          'Mobile Number',
          'Department',
          'Assigned Shift',
          'Day-wise Week Off Days',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ]
      : [
          'Employee ID',
          'Employee Name',
          'Mobile Number',
          'Department',
          'Designation',
          'Assigned Shift',
          'Day-wise Week Off Days',
          'Month',
        ];

  const escapeCsv = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = employees.map((emp) => {
    const shift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
    const offDays = emp.weekOffDays && emp.weekOffDays.length > 0 ? emp.weekOffDays : companyWeekOffDays;
    const offDaysStr = offDays.join(', ');

    if (type === 'weekly') {
      return [
        escapeCsv(emp.id),
        escapeCsv(emp.name),
        escapeCsv(emp.phone || ''),
        escapeCsv(emp.department),
        escapeCsv(shift?.name || 'General Shift'),
        escapeCsv(offDaysStr),
        escapeCsv(offDays.includes('Monday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Tuesday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Wednesday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Thursday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Friday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Saturday') ? 'OFF' : 'WORK'),
        escapeCsv(offDays.includes('Sunday') ? 'OFF' : 'WORK'),
      ].join(',');
    } else {
      return [
        escapeCsv(emp.id),
        escapeCsv(emp.name),
        escapeCsv(emp.phone || ''),
        escapeCsv(emp.department),
        escapeCsv(emp.designation),
        escapeCsv(shift?.name || 'General Shift'),
        escapeCsv(offDaysStr),
        escapeCsv('August 2026'),
      ].join(',');
    }
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return downloadBlob(blob, `DRK_Goods_${type === 'weekly' ? 'Weekly' : 'Monthly'}_Roster_Template.csv`);
}

/**
 * Normalizes day name string into valid DayOfWeek array
 */
export function normalizeWeekOffDays(input: string | undefined): string[] {
  if (!input || !input.trim()) return ['Sunday'];

  const rawTokens = input
    .replace(/[;&/|]/g, ',')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const matchedDays: string[] = [];

  const dayMap: Record<string, string> = {
    sun: 'Sunday',
    sunday: 'Sunday',
    mon: 'Monday',
    monday: 'Monday',
    tue: 'Tuesday',
    tues: 'Tuesday',
    tuesday: 'Tuesday',
    wed: 'Wednesday',
    wednesday: 'Wednesday',
    thu: 'Thursday',
    thur: 'Thursday',
    thurs: 'Thursday',
    thursday: 'Thursday',
    fri: 'Friday',
    friday: 'Friday',
    sat: 'Saturday',
    saturday: 'Saturday',
  };

  rawTokens.forEach((token) => {
    if (token === 'none' || token === 'no' || token === 'nil' || token === '0') {
      return;
    }
    const day = dayMap[token];
    if (day && !matchedDays.includes(day)) {
      matchedDays.push(day);
    }
  });

  return matchedDays;
}

/**
 * Normalizes Phone 10-digits
 */
function cleanPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Parses uploaded Excel or CSV file
 */
export async function parseRosterFile(
  file: File,
  employees: Employee[],
  shifts: WorkShift[],
  defaultCompanyWeekOff: string[] = ['Sunday']
): Promise<RosterParseResult> {
  const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
  let rawDataRows: Array<Record<string, string>> = [];

  if (isCsv) {
    const text = await file.text();
    rawDataRows = parseCsvText(text);
  } else {
    // Parse XLSX using ExcelJS
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('Spreadsheet does not contain any readable worksheets.');
    }

    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim();
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const rowData: Record<string, string> = {};
      let hasAnyValue = false;

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber] || `Col_${colNumber}`;
        let val = '';
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'text' in cell.value) {
            val = String((cell.value as any).text);
          } else {
            val = String(cell.value);
          }
        }
        val = val.trim();
        if (val) hasAnyValue = true;
        rowData[header] = val;
      });

      if (hasAnyValue) {
        rawDataRows.push(rowData);
      }
    });
  }

  // Now process each raw row and map to employees and shifts
  const parsedRows: ParsedRosterRow[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  rawDataRows.forEach((rowObj, index) => {
    const rowNumber = index + 2; // Accounting for 1-based header

    // Find keys flexibly
    const keys = Object.keys(rowObj);

    const findVal = (...aliases: string[]): string => {
      for (const alias of aliases) {
        const foundKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (foundKey && rowObj[foundKey]) return rowObj[foundKey];
      }
      return '';
    };

    const rawEmpId = findVal('employeeid', 'empid', 'id', 'staffid');
    const rawEmpName = findVal('employeename', 'name', 'staffname', 'empname');
    const rawPhone = findVal('mobilenumber', 'phone', 'mobile', 'contact', 'phonenumber');
    const rawShift = findVal('assignedshift', 'shift', 'shiftname', 'shiftid', 'workshift');
    const rawWeekOff = findVal('daywiseweekoffdays', 'weekoffdays', 'weekoff', 'weeklyoff', 'offdays', 'weeklyoffdays', 'restdays');

    // 1. Match Employee
    let matchedEmployee: Employee | undefined;

    // Match by ID
    if (rawEmpId) {
      matchedEmployee = employees.find((e) => e.id.toLowerCase() === rawEmpId.toLowerCase());
    }

    // Match by Phone
    if (!matchedEmployee && rawPhone) {
      const cleaned = cleanPhone(rawPhone);
      if (cleaned.length >= 6) {
        matchedEmployee = employees.find((e) => cleanPhone(e.phone) === cleaned);
      }
    }

    // Match by Name
    if (!matchedEmployee && rawEmpName) {
      const searchName = rawEmpName.toLowerCase().trim();
      matchedEmployee = employees.find(
        (e) => e.name.toLowerCase().trim() === searchName || e.name.toLowerCase().includes(searchName)
      );
    }

    if (!matchedEmployee) {
      errorCount++;
      parsedRows.push({
        rowNumber,
        rawEmpId,
        rawEmpName,
        rawPhone,
        rawShift,
        rawWeekOff,
        parsedWeekOffDays: [],
        status: 'error',
        message: `Employee not found: "${rawEmpName || rawEmpId || rawPhone || 'Unknown'}"`,
      });
      return;
    }

    // 2. Match Shift
    let matchedShift: WorkShift | undefined;
    let shiftWarning = '';

    if (rawShift) {
      const lowerShift = rawShift.toLowerCase().trim();
      // Match by shift ID
      matchedShift = shifts.find((s) => s.id.toLowerCase() === lowerShift);

      // Match by Shift Name
      if (!matchedShift) {
        matchedShift = shifts.find(
          (s) =>
            s.name.toLowerCase().trim() === lowerShift ||
            lowerShift.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(lowerShift)
        );
      }

      // Keyword match (Morning, Afternoon, Night, General)
      if (!matchedShift) {
        if (lowerShift.includes('morning') || lowerShift.includes('7') || lowerShift.includes('07:00')) {
          matchedShift = shifts.find((s) => s.id === 'shift_morning') || shifts[0];
        } else if (lowerShift.includes('afternoon') || lowerShift.includes('13:00') || lowerShift.includes('1:00')) {
          matchedShift = shifts.find((s) => s.id === 'shift_afternoon') || shifts[0];
        } else if (lowerShift.includes('night') || lowerShift.includes('22:00') || lowerShift.includes('10:00')) {
          matchedShift = shifts.find((s) => s.id === 'shift_night') || shifts[0];
        } else if (lowerShift.includes('general') || lowerShift.includes('09:30') || lowerShift.includes('9:30')) {
          matchedShift = shifts.find((s) => s.id === 'shift_general') || shifts[0];
        }
      }

      if (!matchedShift) {
        shiftWarning = `Shift "${rawShift}" not found. Keeping current shift: ${matchedEmployee.assignedShiftId || 'Standard'}.`;
        matchedShift = shifts.find((s) => s.id === matchedEmployee?.assignedShiftId) || shifts[0];
      }
    } else {
      matchedShift = shifts.find((s) => s.id === matchedEmployee?.assignedShiftId) || shifts[0];
    }

    // 3. Parse Week Off Days
    let parsedWeekOffDays: string[] = [];
    if (rawWeekOff) {
      parsedWeekOffDays = normalizeWeekOffDays(rawWeekOff);
    } else if (matchedEmployee.weekOffDays && matchedEmployee.weekOffDays.length > 0) {
      parsedWeekOffDays = matchedEmployee.weekOffDays;
    } else {
      parsedWeekOffDays = defaultCompanyWeekOff;
    }

    const isWarning = Boolean(shiftWarning);
    if (isWarning) {
      warningCount++;
    } else {
      validCount++;
    }

    parsedRows.push({
      rowNumber,
      matchedEmployee,
      rawEmpId,
      rawEmpName,
      rawPhone,
      matchedShift,
      rawShift,
      parsedWeekOffDays,
      rawWeekOff,
      status: isWarning ? 'warning' : 'valid',
      message: shiftWarning || 'Ready to apply',
    });
  });

  return {
    filename: file.name,
    totalRows: parsedRows.length,
    validCount,
    warningCount,
    errorCount,
    rows: parsedRows,
    hasErrors: errorCount > 0,
  };
}

/**
 * Simple robust CSV text parser
 */
function parseCsvText(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }

  return rows;
}
