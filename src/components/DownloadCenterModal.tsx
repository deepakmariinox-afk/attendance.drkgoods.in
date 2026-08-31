import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  Building,
  Sparkles,
  Smartphone,
  QrCode,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppDownloadModal } from './AppDownloadModal';
import { downloadStandaloneHtmlLauncher } from '../utils/fileDownloader';
import {
  exportAllRecordsToExcel,
  exportAttendanceExcel,
  exportMonthlyPayrollExcel,
  exportStaffDirectoryExcel,
  exportIndividualAttendanceExcel,
} from '../utils/excelExport';
import {
  exportMonthlyPayrollPdf,
  exportIndividualMonthlyAttendancePdf,
  exportEmployeePaySlipPdf,
} from '../utils/pdfExport';

interface DownloadCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadCenterModal: React.FC<DownloadCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    employees,
    attendance,
    payrollRecords,
    leaves,
    locations,
    currentOffice,
    selectedPayrollMonth,
    showNotification,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<string>(selectedPayrollMonth || '2026-08');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    currentUser?.id || (employees.length > 0 ? employees[0].id : '')
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const months = [
    { value: '2026-08', label: 'August 2026 (Current Period)' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-06', label: 'June 2026' },
  ];

  const selectedEmp = employees.find((e) => e.id === selectedEmployeeId) || currentUser || employees[0];
  const selectedEmpPayroll = payrollRecords.find((p) => p.employeeId === selectedEmp?.id);
  const selectedMonthLabel = months.find((m) => m.value === selectedMonth)?.label.split(' (')[0] || selectedMonth;

  // 1. Master Excel Download
  const handleDownloadMasterExcel = async () => {
    try {
      setDownloadingId('master_excel');
      await exportAllRecordsToExcel({
        employees,
        attendance,
        payrollRecords,
        leaves,
        locations,
        selectedMonth,
        exportedBy: currentUser?.name || 'Deepak Yadav',
      });
      showNotification('success', 'Master Enterprise Database downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Master Excel file.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 2. All Attendance Excel
  const handleDownloadAttendanceExcel = async () => {
    try {
      setDownloadingId('attendance_excel');
      await exportAttendanceExcel(attendance, employees, selectedMonth);
      showNotification('success', `Exported Attendance Ledger for ${selectedMonthLabel} in Excel (.xlsx).`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Attendance Excel.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 3. Individual Attendance Excel
  const handleDownloadIndividualAttendanceExcel = async () => {
    if (!selectedEmp) return;
    try {
      setDownloadingId('individual_attendance_excel');
      await exportIndividualAttendanceExcel(selectedEmp, attendance, selectedMonth, currentOffice);
      showNotification('success', `Exported Attendance Excel for ${selectedEmp.name} (${selectedMonthLabel}).`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Individual Attendance Excel.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 4. Individual Attendance PDF
  const handleDownloadIndividualAttendancePdf = () => {
    if (!selectedEmp) return;
    try {
      setDownloadingId('individual_attendance_pdf');
      exportIndividualMonthlyAttendancePdf(
        selectedEmp,
        attendance,
        selectedMonth,
        selectedMonthLabel,
        currentOffice
      );
      showNotification('success', `Exported Attendance PDF for ${selectedEmp.name} (${selectedMonthLabel}).`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Attendance PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 5. Payroll Register Excel
  const handleDownloadPayrollExcel = async () => {
    try {
      setDownloadingId('payroll_excel');
      await exportMonthlyPayrollExcel(payrollRecords, selectedMonthLabel, currentUser?.name || 'Admin');
      showNotification('success', `Exported Payroll Register Excel for ${selectedMonthLabel}.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Payroll Excel.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 6. Payroll Register PDF
  const handleDownloadPayrollPdf = () => {
    try {
      setDownloadingId('payroll_pdf');
      exportMonthlyPayrollPdf(payrollRecords, selectedMonthLabel, currentUser?.name || 'Admin');
      showNotification('success', `Exported Monthly Payroll PDF for ${selectedMonthLabel}.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Payroll PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 7. Staff Directory Excel
  const handleDownloadStaffDirectoryExcel = async () => {
    try {
      setDownloadingId('staff_excel');
      await exportStaffDirectoryExcel(employees, locations);
      showNotification('success', 'Exported Staff Directory Roster in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Staff Directory Excel.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 8. Individual Pay Slip PDF
  const handleDownloadPaySlipPdf = () => {
    if (!selectedEmp) return;
    try {
      setDownloadingId('payslip_pdf');
      const empPayroll = selectedEmpPayroll || {
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        employeeRole: selectedEmp.designation,
        department: selectedEmp.department,
        phone: selectedEmp.phone,
        month: selectedMonth,
        yearlySalary: selectedEmp.yearlySalary || 1440000,
        baseSalary: selectedEmp.monthlyBaseSalary || 120000,
        workingDaysExpected: 21,
        daysPresent: 21,
        daysLate: 0,
        daysAbsent: 0,
        totalRegularHours: 168,
        totalOvertimeHours: 0,
        regularPay: selectedEmp.monthlyBaseSalary || 120000,
        overtimePay: 0,
        bonuses: 2000,
        deductions: 0,
        taxWithheld: 12200,
        netPay: 109800,
        paymentStatus: 'processed' as const,
        generatedAt: new Date().toISOString(),
      };

      exportEmployeePaySlipPdf(selectedEmp, empPayroll, attendance, currentOffice);
      showNotification('success', `Downloaded Pay Slip PDF for ${selectedEmp.name}.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Pay Slip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Enterprise Download Center</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Excel & PDF
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instant export of official attendance sheets, payroll registers, staff rosters & payslips
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-download-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label htmlFor="select-download-month" className="text-xs font-semibold text-slate-700">Period:</label>
              <select
                id="select-download-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <label htmlFor="select-download-employee" className="text-xs font-semibold text-slate-700">Staff Target:</label>
              <select
                id="select-download-employee"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Master Download Button */}
          <button
            type="button"
            onClick={handleDownloadMasterExcel}
            disabled={downloadingId === 'master_excel'}
            id="btn-download-all-master"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{downloadingId === 'master_excel' ? 'Generating Workbook...' : 'Download Full Master Database (.xlsx)'}</span>
          </button>
        </div>

        {/* Download Grid Options */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Featured Mobile App Installation Banner */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border border-blue-700/50 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h4 className="font-bold text-white text-sm">Download & Install DRK Goods Mobile App</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Android, iOS & Desktop (PWA)
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  Get the official standalone mobile app with instant GPS radar locks, offline punch caching, and 1-tap check-in.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const appUrl = window.location.href.split('?')[0];
                  downloadStandaloneHtmlLauncher(appUrl, 'DRK Goods Enterprise');
                  showNotification(
                    'success',
                    'Downloaded "DRK_Goods_Enterprise_App.html". Open it on any device to launch the app!'
                  );
                }}
                id="btn-download-app-file-from-center"
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Download offline HTML launcher package"
              >
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Download App (.html)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAppDownloadOpen(true)}
                id="btn-open-app-install-from-center"
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Install Guide & QR</span>
              </button>
            </div>
          </div>

          {/* Section 1: Attendance Downloads */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Attendance & GPS Punch Records
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: All Staff Attendance Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 inline-block">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Excel
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">All Staff Attendance Sheet</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete punch telemetry, in/out timestamps, hours worked & OT for all employees in {selectedMonthLabel}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAttendanceExcel}
                  disabled={downloadingId === 'attendance_excel'}
                  id="btn-dl-attendance-excel"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'attendance_excel' ? 'Downloading...' : 'Download Attendance (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: Selected Staff Attendance Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 inline-block">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Excel
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Individual Attendance ({selectedEmp?.name.split(' ')[0]})</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Monthly punch card, GPS verification breakdown, and work session hours for {selectedEmp?.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadIndividualAttendanceExcel}
                  disabled={downloadingId === 'individual_attendance_excel'}
                  id="btn-dl-indiv-attendance-excel"
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'individual_attendance_excel' ? 'Downloading...' : 'Download Punch Card (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 3: Selected Staff Attendance PDF */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-red-50 text-red-600 inline-block">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                      PDF
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Attendance Summary Sheet</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Official printable monthly attendance sheet with header, verification seal & signatures.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadIndividualAttendancePdf}
                  disabled={downloadingId === 'individual_attendance_pdf'}
                  id="btn-dl-attendance-pdf"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'individual_attendance_pdf' ? 'Generating PDF...' : 'Download Attendance PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Payroll & Salary Downloads */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Payroll, CTC & Pay Slips
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Payroll Register Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 inline-block">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Excel
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Monthly Payroll Register</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    All employee salary calculations, Yearly CTC, gross earnings, penalties, TDS and net payouts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPayrollExcel}
                  disabled={downloadingId === 'payroll_excel'}
                  id="btn-dl-payroll-excel"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'payroll_excel' ? 'Downloading...' : 'Download Payroll (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: Master Payroll PDF Ledger */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-red-50 text-red-600 inline-block">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                      PDF
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Payroll Summary Report</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Comprehensive landscape executive payroll report for management & audit compliance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPayrollPdf}
                  disabled={downloadingId === 'payroll_pdf'}
                  id="btn-dl-payroll-pdf"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'payroll_pdf' ? 'Generating PDF...' : 'Download Payroll PDF'}</span>
                </button>
              </div>

              {/* Card 3: Employee Pay Slip PDF */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600 inline-block">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      PDF
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Pay Slip ({selectedEmp?.name.split(' ')[0]})</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Formal monthly pay slip with Yearly CTC, itemized earnings, deductions, tax and authorized seal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPaySlipPdf}
                  disabled={downloadingId === 'payslip_pdf'}
                  id="btn-dl-payslip-pdf"
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'payslip_pdf' ? 'Generating Slip...' : 'Download Pay Slip PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Staff Directory & Master Backup */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Staff Roster & Full Database Export
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Staff Directory Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-purple-200 hover:shadow-md transition bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600 inline-block">
                      <Users className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Excel
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Staff Roster Directory</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete listing of all registered workforce employees, mobile numbers, department, assigned shift, Yearly CTC & device bindings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStaffDirectoryExcel}
                  disabled={downloadingId === 'staff_excel'}
                  id="btn-dl-staff-excel"
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingId === 'staff_excel' ? 'Downloading...' : 'Download Staff Roster (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: Master 5-in-1 Excel */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 hover:shadow-lg transition bg-emerald-50/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-600 text-white inline-block shadow-sm">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                      5-in-1 Master
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Enterprise Master Database</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    Multi-tab workbook containing Staff Directory, Attendance Punch Audit, Monthly Payroll, Leave Ledger & GPS Geofences in one consolidated file.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadMasterExcel}
                  disabled={downloadingId === 'master_excel'}
                  id="btn-dl-master-workbook"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingId === 'master_excel' ? 'Generating...' : 'Download Full Master Excel (.xlsx)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Exported by <strong className="text-slate-800">{currentUser?.name || 'Deepak Yadav'}</strong> • All dates formatted for audit compliance
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* DRK Goods Mobile App Download & Install Modal */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
      />
    </div>
  );
};
