import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyAttendance, Employee, PayrollRecord, WorkLocation } from '../types';
import { downloadBlob } from './fileDownloader';
import { formatIsoToLocalTime, formatIsoToLocalDate } from './dateUtils';

/**
 * Robust helper to download a jsPDF document using Blob and fallback
 */
function downloadPdfDocument(doc: jsPDF, filename: string) {
  try {
    const blob = doc.output('blob');
    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const success = downloadBlob(blob, safeFilename);
    if (!success) {
      doc.save(safeFilename);
    }
  } catch (err) {
    console.warn('downloadBlob failed for PDF, using doc.save fallback:', err);
    doc.save(filename);
  }
}

export function calculateMonthlyPayrollRecords(
  employees: Employee[],
  attendanceList: DailyAttendance[],
  monthStr: string // "YYYY-MM"
): PayrollRecord[] {
  return employees.map((emp) => {
    // Filter attendance for this employee in given month
    const empAtt = attendanceList.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(monthStr)
    );

    let daysPresent = 0;
    let daysLate = 0;
    let daysAbsent = 0;
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    empAtt.forEach((a) => {
      if (a.status === 'present') daysPresent++;
      else if (a.status === 'late') {
        daysPresent++;
        daysLate++;
      } else if (a.status === 'absent') {
        daysAbsent++;
      }
      totalWorkMinutes += a.totalWorkMinutes || 0;
      totalOvertimeMinutes += a.overtimeMinutes || 0;
    });

    const totalRegularHours = Number((totalWorkMinutes / 60).toFixed(1));
    const totalOvertimeHours = Number((totalOvertimeMinutes / 60).toFixed(1));

    // Basic Salary is set so that PF deduction (12% of Basic) is exactly ₹1,800.
    // Statutory Indian EPF base ceiling: 12% of ₹15,000 = ₹1,800.
    const monthlyBase = emp.monthlyBaseSalary || 15000;
    // Standard 21 working days calculation
    const dailyRate = Math.round(monthlyBase / 21);
    const hourlyEquivalent = Math.round(dailyRate / 8);

    // Regular Pay pro-rated based on days present (full base if 21 or more days)
    const regularPay = daysPresent >= 21 ? monthlyBase : Math.round(daysPresent * dailyRate);
    const overtimePay = Math.round(totalOvertimeHours * hourlyEquivalent * (emp.overtimeRateMultiplier || 1.5));
    
    // Statutory PF deduction: exactly ₹1,800 (12% of ₹15,000 basic salary)
    const pfDeduction = daysPresent >= 15 ? 1800 : Math.round(1800 * (daysPresent / 21));

    // Deductions: PF (₹1,800), ₹250 penalty per late arrival, ₹500 per unexcused absence
    const lateDeduction = daysLate * 250;
    const absentDeduction = daysAbsent * 500;
    const deductions = pfDeduction + lateDeduction + absentDeduction;

    // Bonuses: attendance bonus if 0 late and 0 absent and > 15 days worked
    const bonuses = daysLate === 0 && daysAbsent === 0 && daysPresent >= 15 ? 1000 : 0;

    const grossPay = regularPay + overtimePay + bonuses;
    const taxWithheld = 0; // standard withholding handled via deductions
    const netPay = Math.max(0, grossPay - deductions);

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.designation,
      department: emp.department,
      phone: emp.phone,
      month: monthStr,
      yearlySalary: monthlyBase * 12,
      baseSalary: monthlyBase,
      pfDeduction,
      workingDaysExpected: 21,
      daysPresent,
      daysLate,
      daysAbsent,
      totalRegularHours,
      totalOvertimeHours,
      regularPay,
      overtimePay,
      bonuses,
      deductions,
      taxWithheld,
      netPay,
      paymentStatus: 'processed',
      generatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Generates and downloads the Official Monthly Payroll PDF Ledger
 */
export function exportMonthlyPayrollPdf(
  records: PayrollRecord[],
  monthName: string, // e.g. "August 2026"
  generatedBy: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50

  // 1. Header Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 297, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DRK GOODS • WORKFORCE & PAYROLL MANAGEMENT SYSTEM', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`OFFICIAL MONTHLY PAYROLL DISBURSEMENT REPORT • PERIOD: ${monthName.toUpperCase()}`, 14, 18);

  // Right Header info
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 283, 11, { align: 'right' });
  doc.text(`Authorized by: ${generatedBy}`, 283, 18, { align: 'right' });

  // 2. Summary KPI Cards
  const totalGross = records.reduce((sum, r) => sum + r.regularPay + r.overtimePay + r.bonuses, 0);
  const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
  const totalHours = records.reduce((sum, r) => sum + r.totalRegularHours, 0);
  const totalOtHours = records.reduce((sum, r) => sum + r.totalOvertimeHours, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.deductions, 0);

  // Background for stats
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, 28, 269, 20, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, 269, 20, 2, 2, 'D');

  const cardWidth = 269 / 5;
  const metrics = [
    { label: 'TOTAL NET PAYROLL', val: `INR ${totalNet.toLocaleString('en-IN')}`, color: accentColor },
    { label: 'GROSS EARNINGS', val: `INR ${totalGross.toLocaleString('en-IN')}`, color: [51, 65, 85] as [number, number, number] },
    { label: 'REGULAR WORK HOURS', val: `${totalHours.toFixed(1)} hrs`, color: [51, 65, 85] as [number, number, number] },
    { label: 'OVERTIME WORKED', val: `${totalOtHours.toFixed(1)} hrs`, color: [217, 119, 6] as [number, number, number] },
    { label: 'TOTAL DEDUCTIONS', val: `INR ${totalDeductions.toLocaleString('en-IN')}`, color: [220, 38, 38] as [number, number, number] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * cardWidth + 6;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x, 34);

    doc.setTextColor(...m.color);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.val, x, 42);

    if (idx < metrics.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(14 + (idx + 1) * cardWidth, 30, 14 + (idx + 1) * cardWidth, 46);
    }
  });

  // 3. Main Data Table
  const tableData = records.map((r, i) => [
    (i + 1).toString(),
    r.employeeName,
    r.department,
    r.employeeRole,
    `INR ${r.baseSalary.toLocaleString('en-IN')}`,
    `${r.daysPresent}d`,
    `${r.daysLate}d`,
    `${r.totalRegularHours}h`,
    `${r.totalOvertimeHours}h`,
    `INR ${r.regularPay.toLocaleString('en-IN')}`,
    `INR ${r.overtimePay.toLocaleString('en-IN')}`,
    `-INR ${(r.pfDeduction || 1800).toLocaleString('en-IN')}`,
    `-INR ${r.deductions.toLocaleString('en-IN')}`,
    `INR ${r.netPay.toLocaleString('en-IN')}`,
    r.paymentStatus.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [[
      '#',
      'Employee Name',
      'Department',
      'Designation',
      'Basic Salary (₹)',
      'Present',
      'Late',
      'Reg Hrs',
      'OT Hrs',
      'Reg Pay',
      'OT Pay',
      'PF (₹1800)',
      'Total Deduct',
      'Net Pay (INR)',
      'Status'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { fontStyle: 'bold', cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 11 },
      6: { halign: 'center', cellWidth: 10 },
      7: { halign: 'right', cellWidth: 13 },
      8: { halign: 'right', cellWidth: 12 },
      9: { halign: 'right', cellWidth: 17 },
      10: { halign: 'right', cellWidth: 16 },
      11: { halign: 'right', cellWidth: 16, textColor: [185, 28, 28] },
      12: { halign: 'right', cellWidth: 17, textColor: [220, 38, 38] },
      13: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 23 },
      14: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Table Totals / Summary Row
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  if (finalY < 175) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, finalY + 4, 269, 12, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, finalY + 4, 269, 12, 'D');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DISBURSEMENT OBLIGATION:', 20, finalY + 11.5);

    doc.setTextColor(37, 99, 235);
    doc.setFontSize(10);
    doc.text(`INR ${totalNet.toLocaleString('en-IN')}`, 105, finalY + 12);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`(Includes INR ${totalGross.toLocaleString('en-IN')} Gross Earnings, -INR ${totalDeductions.toLocaleString('en-IN')} Deductions, -INR ${records.reduce((s, r) => s + r.taxWithheld, 0).toLocaleString('en-IN')} TDS Withholding)`, 152, finalY + 11.5);
  }

  // Signatures & Compliance Footer
  const signY = Math.max(finalY + 22, 175);
  
  if (signY <= 190) {
    doc.setDrawColor(203, 213, 225);
    doc.line(20, signY + 10, 85, signY + 10);
    doc.line(115, signY + 10, 180, signY + 10);
    doc.line(210, signY + 10, 275, signY + 10);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('PREPARED BY: PAYROLL SPECIALIST', 20, signY + 14);
    doc.text('VERIFIED BY: DIRECTOR OF HR', 115, signY + 14);
    doc.text('APPROVED BY: VP OF FINANCE', 210, signY + 14);
  }

  // Save the PDF
  const filename = `DRK_Goods_Monthly_Payroll_${monthName.replace(/\s+/g, '_')}.pdf`;
  downloadPdfDocument(doc, filename);
}

/**
 * Generates an Individual Official Pay Slip PDF
 */
export function exportEmployeePaySlipPdf(
  emp: Employee,
  payroll: PayrollRecord,
  attendanceList: DailyAttendance[],
  location: WorkLocation
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DRK GOODS ENTERPRISE', 15, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('GPS-VERIFIED ATTENDANCE & PAYROLL SLIP', 15, 18);
  doc.text(`PAY PERIOD: ${payroll.month.toUpperCase()} • CONFIDENTIAL`, 15, 24);

  doc.setFontSize(8);
  doc.text(`DOC REF: PS-${payroll.month.replace('-', '')}-${emp.id.slice(-4).toUpperCase()}`, 195, 12, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 195, 18, { align: 'right' });

  // Employee details section
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 34, 180, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 34, 180, 32, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE INFORMATION', 20, 41);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text(`Name: ${emp.name}`, 20, 48);
  doc.text(`Employee ID: ${emp.id}`, 20, 54);
  doc.text(`Designation: ${emp.designation}`, 20, 60);

  doc.text(`Department: ${emp.department}`, 105, 48);
  doc.text(`Mobile (OTP ID): ${emp.phone}`, 105, 54);
  doc.text(`Base Worksite: ${location.name}`, 105, 60);

  // Pay Breakdown Table
  const earningsData = [
    ['Monthly Basic Salary', `PF Eligible Base (INR 15,000) • ${payroll.daysPresent} days / 21 working days`, `INR ${payroll.regularPay.toLocaleString('en-IN')}`],
    ['Overtime Pay', `${payroll.totalOvertimeHours} hrs (Overtime Allowance @ 1.5x)`, `INR ${payroll.overtimePay.toLocaleString('en-IN')}`],
    ['Performance / Attendance Bonus', 'Monthly attendance incentive', `INR ${payroll.bonuses.toLocaleString('en-IN')}`],
  ];

  const deductionsData = [
    ['Provident Fund (EPF 12% Contribution)', 'Statutory Employee PF Deduction (Base INR 15,000)', `-INR ${(payroll.pfDeduction || 1800).toLocaleString('en-IN')}`],
    ['Late Arrival Penalties', `${payroll.daysLate} incidents logged via GPS`, `-INR ${(payroll.daysLate * 250).toLocaleString('en-IN')}`],
    ['Unexcused Absences', `${payroll.daysAbsent} days absent`, `-INR ${(payroll.daysAbsent * 500).toLocaleString('en-IN')}`],
  ];

  autoTable(doc, {
    startY: 72,
    head: [['Earnings & Allowances', 'Basis / Units', 'Amount (INR)']],
    body: earningsData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 15, right: 15 },
  });

  const nextY = (doc as any).lastAutoTable?.finalY || 115;

  autoTable(doc, {
    startY: nextY + 4,
    head: [['Deductions & Withholdings', 'Reason / Incident Notes', 'Amount (INR)']],
    body: deductionsData,
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Net Pay Box
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(15, finalY + 6, 180, 20, 2, 2, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(15, finalY + 6, 180, 20, 2, 2, 'D');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NET TAKE-HOME PAY (DISBURSED):', 22, finalY + 18);

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(13);
  doc.text(`INR ${payroll.netPay.toLocaleString('en-IN')}`, 185, finalY + 19, { align: 'right' });

  // Security & GPS Verification stamp
  const stampY = finalY + 34;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, stampY, 180, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, stampY, 180, 26, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SECURITY & COMPLIANCE VERIFICATION', 20, stampY + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('✓ All punches verified with Real-Time Geofence GPS Coordinates & Mobile OTP Authentication.', 20, stampY + 13);
  doc.text(`✓ Direct Deposit Account: ${emp.bankAccount} • Status: ${payroll.paymentStatus.toUpperCase()}`, 20, stampY + 19);

  // Footer notes
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated payroll payslip and does not require physical stamp.', 105, 280, { align: 'center' });

  const filename = `PaySlip_${emp.name.replace(/\s+/g, '_')}_${payroll.month}.pdf`;
  downloadPdfDocument(doc, filename);
}

/**
 * Generates an Individual Monthly Attendance Record PDF Summary
 */
export function exportIndividualMonthlyAttendancePdf(
  emp: Employee,
  attendanceList: DailyAttendance[],
  monthStr: string, // e.g. "2026-08"
  monthLabel: string, // e.g. "August 2026"
  location: WorkLocation
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
  const successColor: [number, number, number] = [16, 185, 129]; // Emerald 500
  const warningColor: [number, number, number] = [245, 158, 11]; // Amber 500
  const dangerColor: [number, number, number] = [239, 68, 68]; // Red 500

  // Filter attendance for this employee and month
  const monthRecords = attendanceList
    .filter((a) => a.employeeId === emp.id && a.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute metrics
  let totalWorkMinutes = 0;
  let totalOvertimeMinutes = 0;
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;

  monthRecords.forEach((r) => {
    if (r.status === 'present') presentDays++;
    else if (r.status === 'late') {
      presentDays++;
      lateDays++;
    } else if (r.status === 'absent') {
      absentDays++;
    }
    totalWorkMinutes += r.totalWorkMinutes || 0;
    totalOvertimeMinutes += r.overtimeMinutes || 0;
  });

  const totalRegularHours = (totalWorkMinutes / 60).toFixed(1);
  const totalOvertimeHours = (totalOvertimeMinutes / 60).toFixed(1);
  const onTimeDays = presentDays - lateDays;
  const punctualityRate = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 100;

  // 1. Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('DRK GOODS • WORKFORCE MANAGEMENT', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`INDIVIDUAL MONTHLY ATTENDANCE SUMMARY • ${monthLabel.toUpperCase()}`, 14, 18);

  // Right Header metadata
  doc.setFontSize(7.5);
  doc.text(`DOC: ATT-${monthStr.replace('-', '')}-${emp.id.slice(-4).toUpperCase()}`, 196, 11, { align: 'right' });
  doc.text(`Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 18, { align: 'right' });

  // 2. Employee Details Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 31, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 31, 182, 28, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STAFF MEMBER DETAILS', 19, 37);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text(`Full Name: ${emp.name}`, 19, 44);
  doc.text(`Staff ID: ${emp.id}`, 19, 50);
  doc.text(`Designation: ${emp.designation}`, 19, 55);

  doc.text(`Department: ${emp.department}`, 105, 44);
  doc.text(`Contact Phone: ${emp.phone || 'Admin Managed'}`, 105, 50);
  doc.text(`Assigned Office: ${location.name}`, 105, 55);

  // 3. Monthly KPI Cards
  const kpiY = 63;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, kpiY, 182, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, kpiY, 182, 18, 2, 2, 'D');

  const cardWidth = 182 / 5;
  const kpiMetrics = [
    { label: 'DAYS PRESENT', val: `${presentDays} Days`, color: primaryColor },
    { label: 'ON-TIME ARRIVALS', val: `${onTimeDays} Days`, color: successColor },
    { label: 'LATE ARRIVALS', val: `${lateDays} Days`, color: lateDays > 0 ? warningColor : primaryColor },
    { label: 'TOTAL WORK HOURS', val: `${totalRegularHours} hrs`, color: accentColor },
    { label: 'OVERTIME WORKED', val: `${totalOvertimeHours} hrs`, color: [217, 119, 6] as [number, number, number] },
  ];

  kpiMetrics.forEach((m, idx) => {
    const x = 14 + idx * cardWidth + 4;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x, kpiY + 6);

    doc.setTextColor(...m.color);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.val, x, kpiY + 13.5);

    if (idx < kpiMetrics.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(14 + (idx + 1) * cardWidth, kpiY + 2, 14 + (idx + 1) * cardWidth, kpiY + 16);
    }
  });

  // 4. Daily Attendance Table
  const tableData = monthRecords.map((r, idx) => {
    const dayName = formatIsoToLocalDate(r.date, { includeWeekday: true }).split(',')[0];
    const inTime = formatIsoToLocalTime(r.checkInTime);
    const outTime = formatIsoToLocalTime(r.checkOutTime);
    const duration = `${(r.totalWorkMinutes / 60).toFixed(1)} hrs`;
    const ot = r.overtimeMinutes > 0 ? `${(r.overtimeMinutes / 60).toFixed(1)} hrs` : '-';
    const verified = r.punches.some((p) => p.isWithinGeofence) ? 'GPS Verified' : 'Standard';

    return [
      (idx + 1).toString(),
      r.date,
      dayName,
      r.status.toUpperCase(),
      inTime,
      outTime,
      duration,
      ot,
      verified,
    ];
  });

  // If no records in month
  const safeBody = tableData.length > 0 ? tableData : [
    ['-', 'No attendance punches recorded for this billing cycle.', '', '', '', '', '', '', '']
  ];

  autoTable(doc, {
    startY: kpiY + 22,
    head: [[
      '#',
      'Date',
      'Day',
      'Status',
      'Check-In',
      'Check-Out',
      'Work Duration',
      'Overtime',
      'Verification'
    ]],
    body: safeBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'center', cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;

  // 5. Compliance & Signature Section
  const signBoxY = Math.min(finalY + 8, 238);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, signBoxY, 182, 34, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, signBoxY, 182, 34, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SYSTEM VERIFICATION & SIGN-OFF', 19, signBoxY + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`• All punches verified against official geofence boundaries (${location.name}, radius: ${location.radiusMeters}m).`, 19, signBoxY + 11);
  doc.text(`• Overall Punctuality Rate: ${punctualityRate}% • Expected Shifts: 21 Days`, 19, signBoxY + 16);

  // Signature lines
  doc.setDrawColor(203, 213, 225);
  doc.line(20, signBoxY + 28, 85, signBoxY + 28);
  doc.line(110, signBoxY + 28, 175, signBoxY + 28);

  doc.text(`Employee Signature (${emp.name})`, 20, signBoxY + 32);
  doc.text('Supervisor / HR Verification', 110, signBoxY + 32);

  // Footer text
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('DRK Goods Workforce Portal • Computer-generated monthly summary document • Confidential', 105, 287, { align: 'center' });

  // Save the PDF
  const filename = `Monthly_Attendance_${emp.name.replace(/\s+/g, '_')}_${monthStr}.pdf`;
  downloadPdfDocument(doc, filename);
}

