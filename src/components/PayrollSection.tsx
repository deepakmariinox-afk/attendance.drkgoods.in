import React, { useState } from 'react';
import {
  DollarSign,
  Download,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  Percent,
  Search,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportMonthlyPayrollPdf, exportEmployeePaySlipPdf } from '../utils/pdfExport';
import {
  exportMonthlyPayrollExcel,
  exportAllRecordsToExcel,
  exportDailyPunchSummaryExcel,
} from '../utils/excelExport';
import { PayrollRecord } from '../types';

export const PayrollSection: React.FC = () => {
  const {
    payrollRecords,
    employees,
    attendance,
    leaves,
    currentUser,
    selectedPayrollMonth,
    setSelectedPayrollMonth,
    locations,
    showNotification,
  } = useApp();

  const [selectedDept, setSelectedDept] = useState<string>(
    currentUser.role === 'admin' ? 'all' : currentUser.department
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPayslip, setPreviewPayslip] = useState<PayrollRecord | null>(null);
  const [selectedEmployeePunchAudit, setSelectedEmployeePunchAudit] = useState<PayrollRecord | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const months = [
    { value: '2026-08', label: 'August 2026 (Current Period)' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-06', label: 'June 2026' },
  ];

  const filteredPayroll = payrollRecords.filter((r) => {
    const matchDept = selectedDept === 'all' || r.department === selectedDept;
    const matchSearch =
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeRole.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  // Aggregated totals
  const totalNet = filteredPayroll.reduce((sum, r) => sum + r.netPay, 0);
  const totalRegular = filteredPayroll.reduce((sum, r) => sum + r.regularPay, 0);
  const totalOvertime = filteredPayroll.reduce((sum, r) => sum + r.overtimePay, 0);
  const totalDeductions = filteredPayroll.reduce((sum, r) => sum + r.deductions, 0);
  const totalHours = filteredPayroll.reduce((sum, r) => sum + r.totalRegularHours + r.totalOvertimeHours, 0);
  const totalTax = filteredPayroll.reduce((sum, r) => sum + r.taxWithheld, 0);

  const handleExportFullPdf = () => {
    const monthObj = months.find((m) => m.value === selectedPayrollMonth);
    const monthName = monthObj ? monthObj.label.split(' (')[0] : selectedPayrollMonth;
    exportMonthlyPayrollPdf(filteredPayroll, monthName, currentUser.name);
    showNotification('success', `Exported Monthly Payroll PDF for ${monthName}.`);
  };

  const handleExportPayrollExcel = async () => {
    try {
      setIsExportingExcel(true);
      const monthObj = months.find((m) => m.value === selectedPayrollMonth);
      const monthName = monthObj ? monthObj.label.split(' (')[0] : selectedPayrollMonth;
      await exportMonthlyPayrollExcel(filteredPayroll, monthName, currentUser.name);
      showNotification('success', `Downloaded Monthly Payroll Excel (.xlsx) for ${monthName}.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Payroll Excel file.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportMasterExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportAllRecordsToExcel({
        employees,
        attendance,
        payrollRecords,
        leaves,
        locations,
        selectedMonth: selectedPayrollMonth,
        exportedBy: currentUser.name,
      });
      showNotification('success', 'Master Workforce Database (All Records) downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export Master Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadIndividualPayslip = (payroll: PayrollRecord) => {
    const emp = employees.find((e) => e.id === payroll.employeeId);
    if (!emp) return;
    const loc = locations.find((l) => l.id === emp.assignedLocationId) || locations[0];
    exportEmployeePaySlipPdf(emp, payroll, attendance, loc);
    showNotification('success', `Downloaded Pay Slip PDF for ${emp.name}.`);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  return (
    <div className="space-y-6">
      {/* Top Banner with Automated PDF & Excel Export */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <DollarSign className="w-4 h-4" />
            <span>Automated Monthly Payroll Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Payroll & Comprehensive Excel / PDF Reporting
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Calculated directly from real-time GPS check-in hours, overtime multipliers, late arrival penalties, and statutory tax withholdings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Month selector */}
          <select
            value={selectedPayrollMonth}
            onChange={(e) => setSelectedPayrollMonth(e.target.value)}
            className="px-4 py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Export Excel Button */}
          <button
            onClick={handleExportPayrollExcel}
            disabled={isExportingExcel}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            id="btn-export-payroll-excel"
            title="Download Monthly Payroll Ledger in Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportFullPdf}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            id="btn-export-monthly-pdf"
            title="Download Monthly Payroll PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          {/* Master DB Excel Button */}
          <button
            onClick={handleExportMasterExcel}
            disabled={isExportingExcel}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            id="btn-export-master-records-excel"
            title="Download All Enterprise Records in Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>All Records (Excel)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Net Disbursement</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">₹{totalNet.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-400">Approved for payout</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Regular Earnings</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{totalRegular.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-400">Based on standard hours</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Overtime Pay (1.5x)</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">₹{totalOvertime.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-amber-600 font-medium">After-hours & weekend</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">GPS Late Penalties</span>
          <div className="text-2xl font-bold text-red-600 mt-1">-₹{totalDeductions.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-red-600">Late arrivals & absence</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Tax Withheld (TDS 10%)</span>
          <div className="text-2xl font-bold text-slate-700 mt-1">-₹{totalTax.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-400">Estimated statutory</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Itemized Payroll Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Monthly Staff Compensation Ledger</h3>
            <p className="text-xs text-slate-500">Verified attendance calculations for {selectedPayrollMonth} (INR)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-right">Basic Salary</th>
                <th className="py-3 px-3 text-center">Days Present</th>
                <th className="py-3 px-3 text-center">Late Incidents</th>
                <th className="py-3 px-3 text-right">Reg Hours</th>
                <th className="py-3 px-3 text-right">OT Hours</th>
                <th className="py-3 px-3 text-right">PF (₹1800)</th>
                <th className="py-3 px-3 text-right">Total Deductions</th>
                <th className="py-3 px-3 text-right font-bold">Net Pay</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayroll.map((rec) => {
                return (
                  <tr key={rec.employeeId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-400">{rec.employeeRole}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">{rec.department}</td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      ₹{(rec.baseSalary || 15000).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                        {rec.daysPresent} days
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {rec.daysLate > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                          {rec.daysLate} late
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {rec.totalRegularHours}h
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-amber-600 font-semibold">
                      {rec.totalOvertimeHours > 0 ? `${rec.totalOvertimeHours}h` : '-'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-red-600 font-medium">
                      -₹{(rec.pfDeduction || 1800).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-red-600 font-medium">
                      {rec.deductions > 0 ? `-₹${rec.deductions.toLocaleString('en-IN')}` : '₹0'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 text-sm">
                      ₹{rec.netPay.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmployeePunchAudit(rec)}
                          title="View Date-Wise Daily Punch In/Out Breakdown"
                          className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Punches</span>
                        </button>
                        <button
                          onClick={() => setPreviewPayslip(rec)}
                          title="Quick View Slip"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadIndividualPayslip(rec)}
                          title="Download Pay Slip PDF"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date-Wise Daily Punch Audit Breakdown Modal */}
      {selectedEmployeePunchAudit && (() => {
        const empAttList = attendance
          .filter(
            (a) =>
              a.employeeId === selectedEmployeePunchAudit.employeeId &&
              a.date.startsWith(selectedPayrollMonth || '2026-08')
          )
          .sort((a, b) => b.date.localeCompare(a.date));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-sm">
                      Daily Punch In/Out Audit: {selectedEmployeePunchAudit.employeeName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedEmployeePunchAudit.department} • Period: {selectedPayrollMonth} ({empAttList.length} Recorded Punch Days)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployeePunchAudit(null)}
                  className="text-slate-400 hover:text-white text-base font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 font-medium">Monthly Attendance Progress</span>
                    <div className="font-semibold text-slate-900 text-sm">
                      {selectedEmployeePunchAudit.daysPresent} Days Present • {selectedEmployeePunchAudit.totalRegularHours} Regular Hrs • {selectedEmployeePunchAudit.totalOvertimeHours} OT Hrs
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await exportDailyPunchSummaryExcel({
                        attendanceList: empAttList,
                        employees,
                        monthStr: selectedPayrollMonth,
                        title: `DRK Goods Daily Punch - ${selectedEmployeePunchAudit.employeeName}`,
                      });
                      showNotification('success', `Exported Punch Ledger for ${selectedEmployeePunchAudit.employeeName}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel</span>
                  </button>
                </div>

                {empAttList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No individual punch records found for this month yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Punch-In</th>
                          <th className="py-2.5 px-3">Punch-Out</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">OT</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empAttList.map((att) => {
                          const inPunch = att.punches?.find((p) => p.type === 'check_in');
                          const outPunch = att.punches?.find((p) => p.type === 'check_out');
                          const isAuto10 = outPunch?.overrideNote?.includes('10 Hours') || outPunch?.overrideNote?.includes('Auto');

                          const workHrs = Math.floor((att.totalWorkMinutes || 0) / 60);
                          const workMins = (att.totalWorkMinutes || 0) % 60;
                          const otHrs = Math.floor((att.overtimeMinutes || 0) / 60);
                          const otMins = (att.overtimeMinutes || 0) % 60;

                          return (
                            <tr key={att.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                {att.date}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-700 font-mono">
                                {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {att.checkOutTime ? (
                                  <div>
                                    <span className="text-slate-800 font-semibold">
                                      {new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isAuto10 && (
                                      <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                                        Auto 10h
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-[10px]">In Progress</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-800">
                                {workHrs}h {workMins}m
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {(att.overtimeMinutes || 0) > 0 ? (
                                  <span className="text-amber-600 font-bold">+{otHrs}h {otMins}m</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  att.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : att.status === 'late'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {att.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEmployeePunchAudit(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pay Slip Modal Preview */}
      {previewPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-sm">Official Pay Slip: {previewPayslip.employeeName}</h3>
              </div>
              <button onClick={() => setPreviewPayslip(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Department</span>
                  <span className="font-semibold text-slate-900">{previewPayslip.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Designation</span>
                  <span className="font-semibold text-slate-900">{previewPayslip.employeeRole}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Period</span>
                  <span className="font-mono text-slate-900">{previewPayslip.month}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Security Phone OTP</span>
                  <span className="font-mono text-slate-900">{previewPayslip.phone}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 border-t border-b border-slate-100 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Salary (₹15,000 base):</span>
                  <span className="font-mono font-medium text-slate-900">₹{(previewPayslip.baseSalary || 15000).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Earned Regular Pay ({previewPayslip.totalRegularHours} hrs):</span>
                  <span className="font-mono font-medium text-slate-900">₹{previewPayslip.regularPay.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Overtime Earnings ({previewPayslip.totalOvertimeHours} hrs @ 1.5x):</span>
                  <span className="font-mono font-medium text-amber-600">+₹{previewPayslip.overtimePay.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Attendance Bonus:</span>
                  <span className="font-mono font-medium text-emerald-600">+₹{previewPayslip.bonuses.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Provident Fund (PF Deduction):</span>
                  <span className="font-mono font-medium text-red-600">-₹{(previewPayslip.pfDeduction || 1800).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Late & Absence Penalties:</span>
                  <span className="font-mono font-medium text-red-600">-₹{previewPayslip.deductions.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Net Total */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-blue-900 uppercase">Net Disbursed Compensation</span>
                  <p className="text-[10px] text-blue-700">Bank Direct Deposit Verified</p>
                </div>
                <div className="text-xl font-bold font-mono text-blue-600">
                  ₹{previewPayslip.netPay.toLocaleString('en-IN')} INR
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewPayslip(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadIndividualPayslip(previewPayslip);
                    setPreviewPayslip(null);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/20 inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
